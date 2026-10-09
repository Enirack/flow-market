# Docker

Ce répertoire contient les Dockerfiles de production, un par application
(`api.Dockerfile`, `web.Dockerfile`, `admin.Dockerfile`). Le
`docker-compose.yml` à la racine du repo couvre uniquement les services
d'infrastructure de développement (PostgreSQL, Redis, Meilisearch) ; il n'y
a pas de `docker-compose.prod.yml` fourni, le choix d'orchestrateur de
production (Kubernetes, ECS, Nomad...) étant laissé à l'environnement de
déploiement cible.

Voir [`docs/deployment.md`](../docs/deployment.md) pour la stratégie de
déploiement complète (build des images, variables d'environnement,
migrations, rollback) et [`docs/security.md`](../docs/security.md) pour les
pratiques de sécurité appliquées.

## Construire une image

Depuis la racine du monorepo (le contexte de build doit inclure tout le
workspace pnpm) :

```bash
docker build -f docker/api.Dockerfile   -t flowmarket-api   .
docker build -f docker/web.Dockerfile   -t flowmarket-web   --build-arg NEXT_PUBLIC_API_URL=https://api.example.com .
docker build -f docker/admin.Dockerfile -t flowmarket-admin --build-arg NEXT_PUBLIC_API_URL=https://api.example.com .
```
