FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium ca-certificates fonts-liberation \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxrandr2 libgbm1 libasound2 \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml package.json ./
COPY apps/bot/package.json apps/bot/
COPY packages/ai/package.json packages/ai/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile=false

COPY packages ./packages
COPY apps/bot ./apps/bot

RUN pnpm --filter @arena/db prisma generate
RUN pnpm --filter @arena/bot build

VOLUME ["/app/apps/bot/sessions"]

CMD ["pnpm", "--filter", "@arena/bot", "start"]
