# syntax=docker/dockerfile:1
#
# Image de production pour apps/web (Next.js, marketplace + espaces
# client/prestataire). A construire depuis la racine du monorepo :
#   docker build -f docker/web.Dockerfile -t flowmarket-web .
#
# S'appuie sur `output: "standalone"` (next.config.ts) : le build ne produit
# qu'un server.js autonome + les node_modules strictement necessaires, copies
# seuls dans l'image finale (pas de pnpm install en runtime).

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Etape 1 : extraire le sous-graphe "web" du monorepo ---
FROM base AS pruner
COPY . .
RUN npx turbo prune web --docker

# --- Etape 2 : installer puis builder (produit .next/standalone) ---
FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm turbo run build --filter=web...

# --- Etape 3 : image d'execution minimale (standalone, pas de node_modules complet) ---
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 web
WORKDIR /app
ENV NODE_ENV=production

COPY --from=installer --chown=web:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=web:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# Decommenter si un dossier apps/web/public est ajoute plus tard :
# COPY --from=installer --chown=web:nodejs /app/apps/web/public ./apps/web/public

USER web
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web/server.js"]
