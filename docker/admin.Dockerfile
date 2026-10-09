# syntax=docker/dockerfile:1
#
# Image de production pour apps/admin (Next.js, back-office administrateur).
# A construire depuis la racine du monorepo :
#   docker build -f docker/admin.Dockerfile -t flowmarket-admin .
#
# S'appuie sur `output: "standalone"` (next.config.ts) : le build ne produit
# qu'un server.js autonome + les node_modules strictement necessaires, copies
# seuls dans l'image finale (pas de pnpm install en runtime).

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Etape 1 : extraire le sous-graphe "admin" du monorepo ---
FROM base AS pruner
COPY . .
RUN npx turbo prune admin --docker

# --- Etape 2 : installer puis builder (produit .next/standalone) ---
FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm turbo run build --filter=admin...

# --- Etape 3 : image d'execution minimale (standalone, pas de node_modules complet) ---
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 admin
WORKDIR /app
ENV NODE_ENV=production

COPY --from=installer --chown=admin:nodejs /app/apps/admin/.next/standalone ./
COPY --from=installer --chown=admin:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
# Decommenter si un dossier apps/admin/public est ajoute plus tard :
# COPY --from=installer --chown=admin:nodejs /app/apps/admin/public ./apps/admin/public

USER admin
EXPOSE 3001
ENV PORT=3001 HOSTNAME=0.0.0.0
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/admin/server.js"]
