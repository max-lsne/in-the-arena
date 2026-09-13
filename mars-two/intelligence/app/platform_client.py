"""HTTP client for the Rails platform.

This service holds no database credentials. Everything it knows, it knows through
this client, carrying the caller's token, so an agent's reach is exactly the
caller's grant. See docs/adr/0001-stack-split.md.
"""

from __future__ import annotations

import os
from typing import Any

import httpx


class PlatformError(RuntimeError):
    """The platform refused or failed the request."""


class PlatformClient:
    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        http: httpx.Client | None = None,
        timeout: float = 20.0,
    ) -> None:
        self.base_url = (
            base_url or os.environ.get("MARS_PLATFORM_URL", "http://localhost:3000")
        ).rstrip("/")
        self.token = token or os.environ.get("MARS_PLATFORM_TOKEN", "")
        self._http = http or httpx.Client(timeout=timeout)

    @property
    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}", "Accept": "application/json"}

    def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        return self._send("GET", path, params=params)

    def post(self, path: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
        return self._send("POST", path, data=data)

    def _send(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        clean = {k: v for k, v in (params or data or {}).items() if v is not None}
        response = self._http.request(
            method,
            f"{self.base_url}{path}",
            headers=self.headers,
            params=clean if method == "GET" else None,
            data=clean if method != "GET" else None,
        )

        # 404 is what the tenancy policy returns for a company outside the
        # caller's grant, so it is a normal answer rather than an exception:
        # the agent should say it cannot see that company, not crash.
        if response.status_code == 404:
            raise PlatformError(f"not found or not permitted: {path}")
        if response.status_code == 401:
            raise PlatformError("the platform rejected this token")
        if response.status_code >= 400:
            raise PlatformError(f"{path} returned {response.status_code}: {response.text[:200]}")

        return response.json()
