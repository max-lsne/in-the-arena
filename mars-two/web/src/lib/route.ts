/** Where you are, in the URL rather than in a variable.
 *
 * A selected company and an open artefact are both things an operator sends to
 * someone else ("look at Meterpath"). Held in component state they are not
 * addressable, the back button leaves the app, and a reload lands somewhere
 * else. The hash costs twenty lines and no dependency.
 */
export type Route =
  | { kind: "portfolio"; company: string | null }
  | { kind: "artefact"; company: string }
  | { kind: "evals"; detector: string | null };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);

  if (parts[0] === "artefact" && parts[1]) return { kind: "artefact", company: parts[1] };
  if (parts[0] === "evals") return { kind: "evals", detector: parts[1] ?? null };
  if (parts[0] === "company" && parts[1]) return { kind: "portfolio", company: parts[1] };
  return { kind: "portfolio", company: null };
}

export function hrefFor(route: Route): string {
  switch (route.kind) {
    case "artefact":
      return `#/artefact/${route.company}`;
    case "evals":
      return route.detector ? `#/evals/${route.detector}` : "#/evals";
    default:
      return route.company ? `#/company/${route.company}` : "#/";
  }
}

export function navigate(route: Route): void {
  window.location.hash = hrefFor(route);
}
