# syntax=docker/dockerfile:1
#
# Image de production pour apps/api (NestJS). A construire depuis la racine
# du monorepo :
#   docker build -f docker/api.Dockerfile -t flowmarket-api .
#
# Construit l'ensemble du workspace (necessaire pour que Turborepo resolve les
# dependances internes @flowmarket/*), puis utilise `pnpm deploy --prod` pour
# extraire un repertoire autonome ne contenant que apps/api, son dist/, et ses
# dependances de production (workspace:* resolues en fichiers reels, aucune
# devDependency racine comme eslint/playwright/prisma-cli n'y figure).

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Etape 1 : installer tout le workspace et builder api + ses deps internes ---
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=api...

# --- Etape 2 : extraire un sous-repertoire de deploiement production-only ---
FROM base AS deployer
COPY --from=builder /app /app
RUN pnpm --filter=api deploy --prod /deployed

# --- Etape 3 : image d'execution minimale ---
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 api
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deployer --chown=api:nodejs /deployed .

USER api
EXPOSE 4000
# dumb-init reaye correctement SIGTERM vers Node (arret propre en orchestrateur).
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
