# FlowMarket

FlowMarket est une plateforme SaaS marketplace permettant à des prestataires de
services de publier leurs offres et à des clients de les rechercher, réserver
et payer en ligne.

**Auteur / Propriétaire du projet : Enirack**

## Stack technique

| Domaine         | Technologies                                                       |
| --------------- | ------------------------------------------------------------------ |
| Frontend        | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend         | NestJS, TypeScript                                                 |
| Base de données | PostgreSQL, Prisma                                                 |
| Infrastructure  | Docker, Docker Compose, Redis                                      |
| Recherche       | Meilisearch                                                        |
| Temps réel      | WebSockets                                                         |
| Tests           | Vitest, Playwright                                                 |
| CI/CD           | GitHub Actions                                                     |

## Architecture

Monorepo géré avec **pnpm workspaces** + **Turborepo**.

```
flowmarket/
├── apps/
│   ├── web/        # Marketplace publique + espaces client/prestataire (Next.js)
│   ├── admin/       # Back-office administrateur (Next.js, app isolée)
│   └── api/          # API centrale REST + WebSocket (NestJS)
├── packages/
│   ├── ui/            # Design system partagé (shadcn/ui personnalisé)
│   ├── database/       # Schéma Prisma, migrations, client généré
│   ├── auth/            # Stratégies d'authentification, guards RBAC
│   ├── payments/         # Abstraction multi-provider de paiement
│   ├── types/             # Types et schémas partagés front/back
│   └── config/             # Configuration TypeScript/ESLint/Prettier partagée
├── docs/                     # Documentation technique
├── tests/                     # Tests end-to-end transverses (Playwright)
└── docker/                     # Fichiers liés à l'infrastructure conteneurisée
```

Le détail des décisions d'architecture est documenté dans [`docs/architecture.md`](./docs/architecture.md).

## Prérequis

- Node.js ≥ 22
- pnpm ≥ 9 (`npm install -g pnpm`)
- Docker + Docker Compose

## Démarrage

```bash
# 1. Installer les dépendances
pnpm install

# 2. Copier les variables d'environnement
cp .env.example .env

# 3. Démarrer l'infrastructure (PostgreSQL, Redis, Meilisearch)
docker compose up -d

# 4. Lancer les applications en développement
pnpm dev
```

## Scripts disponibles

| Commande         | Description                                         |
| ---------------- | --------------------------------------------------- |
| `pnpm dev`       | Lance toutes les applications en mode développement |
| `pnpm build`     | Build de production de l'ensemble du monorepo       |
| `pnpm lint`      | Lint de l'ensemble du monorepo                      |
| `pnpm typecheck` | Vérification des types TypeScript                   |
| `pnpm test`      | Tests unitaires et d'intégration (Vitest)           |
| `pnpm test:e2e`  | Tests end-to-end (Playwright)                       |
| `pnpm format`    | Formatage du code (Prettier)                        |

## Documentation

- [`docs/architecture.md`](./docs/architecture.md) — architecture générale et décisions
- [`docs/database.md`](./docs/database.md) — modèle de données (ajouté en Phase 2)
- [`docs/api.md`](./docs/api.md) — documentation API (ajouté au fil des phases)
- [`docs/payments.md`](./docs/payments.md) — architecture de paiement (ajouté en Phase 7)
- [`docs/security.md`](./docs/security.md) — pratiques de sécurité (ajouté en Phase 12)
- [`docs/deployment.md`](./docs/deployment.md) — stratégie de déploiement (ajouté en Phase 12)

## Licence

Projet propriétaire — tous droits réservés. Voir [`LICENSE`](./LICENSE).
