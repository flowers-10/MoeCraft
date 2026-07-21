FROM node:20-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/moecraft

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @moecraft/api db:generate \
  && pnpm --filter @moecraft/api build \
  && pnpm --filter @moecraft/api deploy --prod --legacy /app \
  && cd /app \
  && /workspace/apps/api/node_modules/.bin/prisma generate --schema prisma/schema.prisma \
  && node -e "require('@prisma/client')"

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3102
WORKDIR /app

RUN apt-get update \
  && apt-get install --no-install-recommends -y ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /workspace/apps/api/dist ./dist
COPY --from=build --chown=node:node /workspace/apps/api/prisma ./prisma

USER node
EXPOSE 3102
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]
