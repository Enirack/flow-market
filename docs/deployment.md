# Déploiement

## Vue d'ensemble

FlowMarket se déploie comme trois services applicatifs sans état
(stateless), chacun packagé en image Docker, devant des services
d'infrastructure managés :

| Service                         | Rôle                                   | Port par défaut |
| -------------------------------- | --------------------------------------- | ---------------- |
| `apps/api`                       | API REST + WebSocket (NestJS)           | 4000              |
| `apps/web`                       | Marketplace publique + espaces client/prestataire (Next.js) | 3000 |
| `apps/admin`                     | Back-office administrateur (Next.js)    | 3001              |
| PostgreSQL                       | Base de données principale              | 5432              |
| Redis                            | Cache (fiches service, disponibilités)  | 6379              |
| Meilisearch                      | Index de recherche des services         | 7700              |

Aucun service applicatif ne conserve d'état local persistant : les trois
images sont donc horizontalement scalables sans configuration particulière,
et peuvent être redéployées (rolling update) sans coordination entre
instances.

## Images Docker

Chaque application a son propre Dockerfile de production dans `docker/`,
à construire **depuis la racine du monorepo** (le contexte de build doit
inclure l'ensemble du workspace pnpm pour que Turborepo résolve les
dépendances internes `@flowmarket/*`) :

```bash
docker build -f docker/api.Dockerfile   -t flowmarket-api   .
docker build -f docker/web.Dockerfile   -t flowmarket-web   --build-arg NEXT_PUBLIC_API_URL=https://api.flowmarket.example .
docker build -f docker/admin.Dockerfile -t flowmarket-admin --build-arg NEXT_PUBLIC_API_URL=https://api.flowmarket.example .
```

- `api.Dockerfile` installe l'ensemble du workspace, build `api` via
  Turborepo, puis utilise `pnpm deploy --prod` pour extraire un répertoire
  autonome ne contenant que `apps/api`, son `dist/`, et ses dépendances de
  production (aucune devDependency racine comme `eslint`/`playwright` ne se
  retrouve dans l'image finale).
- `web.Dockerfile` / `admin.Dockerfile` s'appuient sur `output: "standalone"`
  (configuré dans leurs `next.config.ts` respectifs, avec
  `outputFileTracingRoot` pointé vers la racine du monorepo pour que le
  traçage de fichiers inclue les packages partagés hoistés) : Next.js
  produit un `server.js` autonome et ne copie que les fichiers réellement
  importés au runtime.
- `NEXT_PUBLIC_API_URL` doit être fourni au **build** (pas seulement au
  runtime) : les variables `NEXT_PUBLIC_*` sont inlinées dans le bundle
  JavaScript côté client au moment du build Next.js.
- `.dockerignore` exclut `.env`, `node_modules`, `.git` et les artefacts de
  build du contexte envoyé au démon Docker.

## Variables d'environnement en production

Toutes les variables sont validées au démarrage par un schéma Zod
(`apps/api/src/config/env.validation.ts`) — l'API refuse de démarrer si une
variable requise manque. Voir `.env.example` pour la liste complète,
organisée par phase. Points d'attention spécifiques à la production :

- `PAYMENT_PROVIDER_MODE=live` doit être positionné explicitement — en son
  absence (`mock`, la valeur par défaut), le provider de paiement factice
  reste actif et les webhooks `MOCK` sont acceptés.
- `SMTP_HOST` doit être renseigné pour que les emails transactionnels
  soient réellement envoyés — vide, l'API journalise les emails au lieu de
  les expédier (comportement voulu en développement, pas en production).
- `AI_API_KEY` active les fonctionnalités IA réelles (Phase 11) ; vide,
  elles retombent sur des heuristiques locales fonctionnelles mais
  dégradées.
- `JWT_ACCESS_SECRET` doit être une valeur aléatoire d'au moins 32
  caractères, générée par environnement (jamais réutilisée entre
  dev/staging/prod) :
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- `CORS_ORIGINS` doit lister explicitement les domaines de `apps/web` et
  `apps/admin` en production — une liste vide bloque tout appel
  cross-origin, y compris depuis les propres frontends.

## Migrations de base de données

Les migrations Prisma ne s'exécutent **pas** automatiquement au démarrage
de l'API (pour garder le déploiement d'image et la migration de schéma
comme deux étapes distinctes, contrôlables indépendamment). Avant de
déployer une nouvelle version de `apps/api` :

```bash
pnpm --filter @flowmarket/database exec prisma migrate deploy
```

À exécuter une seule fois par déploiement (pas par instance), typiquement
comme étape de pipeline CI/CD avant le rolling update des conteneurs API,
avec accès réseau à la base de production.

## Intégration continue

`.github/workflows/ci.yml` exécute à chaque push sur `main` et sur chaque
pull request : `pnpm lint`, `pnpm typecheck`, `pnpm test` et `pnpm build`
sur l'ensemble du monorepo, ainsi que `pnpm audit --prod` (échoue la build
si une vulnérabilité de sévérité `high` ou supérieure est détectée sur les
dépendances de production). Un correctif de vulnérabilité manqué par les
mainteneurs amont se neutralise via `pnpm-workspace.yaml` → `overrides`
(voir `docs/security.md`).

Ce pipeline couvre la qualité du code ; il ne construit pas encore les
images Docker ni ne déploie automatiquement (déploiement continu hors
périmètre de ce document — à brancher sur l'infrastructure cible choisie).

## Stratégie de rollback

Les images étant immuables et taguées (par commit SHA ou version), un
rollback consiste à redéployer le tag précédent sans action supplémentaire
côté application — à l'exception d'une migration de base de données non
rétrocompatible, qui doit être anticipée en amont (migrations additives
uniquement : ajouter avant de retirer, sur deux déploiements distincts,
plutôt qu'une migration destructive dans le même déploiement qui retire
un champ encore lu par l'ancienne version).

## Observabilité

- Logs structurés JSON via `nestjs-pino` (`apps/api`), prêts à être
  ingérés par un agrégateur de logs (aucune configuration supplémentaire
  requise côté application — la sortie standard suffit).
- `GET /health` (hors préfixe `/api`, hors authentification) expose l'état
  de l'API pour les sondes de liveness/readiness d'un orchestrateur.
- Pas de traçage distribué ni de métriques applicatives (APM) configurés à
  ce stade — à ajouter selon l'outil retenu (ex. OpenTelemetry) sans
  changement d'architecture requis.

## Rotation des secrets

Rotation manuelle, pas d'automatisation à ce stade :

1. `JWT_ACCESS_SECRET` : une rotation invalide immédiatement tous les
   access tokens en circulation (durée de vie courte, 15 min par défaut —
   impact limité) mais pas les refresh tokens, qui restent valides
   indépendamment du secret JWT (ils sont opaques, pas des JWT).
2. Clés API des providers de paiement / IA / email : rotation côté
   dashboard du provider, puis mise à jour de la variable d'environnement
   et redéploiement — aucune donnée en base ne dépend de la clé elle-même.
