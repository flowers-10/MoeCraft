FROM node:20-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/storefront/package.json apps/storefront/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY apps/storefront apps/storefront
COPY packages/shared packages/shared
RUN pnpm --filter @moecraft/storefront build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install --no-install-recommends -y ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /workspace/apps/storefront/.output ./.output

USER node
EXPOSE 3100
CMD ["node", ".output/server/index.mjs"]
