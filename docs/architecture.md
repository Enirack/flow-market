# Architecture — FlowMarket

## Vue d'ensemble

FlowMarket est structuré autour d'une **API centrale** (NestJS) consommée par
plusieurs applications clientes (marketplace publique, back-office admin, et à
terme une application mobile). Cette API fait autorité sur toute la logique
métier — authentification, réservations, paiements, RBAC — pour éviter toute
duplication entre les surfaces.

```
apps/web (Next.js)      apps/admin (Next.js)
        │                        │
        └───────────┬────────────┘
                     │ HTTP/REST + WebSocket (JWT)
                     ▼
              apps/api (NestJS)
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
  PostgreSQL       Redis        Meilisearch
  (Prisma)   (cache, sessions,  (recherche)
              rate-limit, queues)
```

## Décisions d'architecture

| Décision                                                        | Justification                                                                                                                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo pnpm + Turborepo                                       | Partage de code (types, UI, auth, paiements) entre apps sans duplication, build incrémental.                                                                                  |
| `admin` en application Next.js séparée de `web`                 | Périmètre de sécurité distinct, bundle séparé, déploiement/scaling indépendants.                                                                                              |
| API REST versionnée plutôt que GraphQL                          | Domaine majoritairement CRUD/transactionnel ; GraphQL ajouterait de la complexité sans bénéfice net à ce stade.                                                               |
| Authentification JWT native (NestJS/Passport) plutôt qu'Auth.js | L'API doit rester la source de vérité unique de l'auth pour toutes les surfaces (web, admin, futur mobile) ; Auth.js est pensé pour un Next.js fullstack sans backend séparé. |
| Package `payments` avec interface `PaymentProvider`             | Support multi-provider (Stripe, Flutterwave, CinetPay, PayDunya) sans coupler le reste de l'application à un fournisseur.                                                     |
| Package `ai` avec interface `AIProvider`                        | Permet de changer de modèle/fournisseur IA sans réécrire l'application.                                                                                                       |
| Ledger de transactions append-only                              | Source de vérité auditable pour le solde prestataire ; jamais de mise à jour destructive sur l'historique financier.                                                          |

## Modules fonctionnels (API)

`auth`, `users`, `providers`, `services`, `categories`, `availability`,
`bookings`, `orders`, `payments`, `wallet`, `payouts`, `subscriptions`,
`promotions`, `reviews`, `messaging`, `notifications`, `disputes`, `admin`,
`ai`, `search`.

## Phasage du développement

Le projet est développé par phases successives, chacune vérifiée (build,
lint, typecheck, tests) et commitée avant de passer à la suivante :

0. Initialisation du projet
1. Foundation technique (Next.js, NestJS, packages, Docker)
2. Modèle de données (PostgreSQL + Prisma)
3. Authentification & autorisation
4. Design system & UX
5. Marketplace (catalogue, recherche, profils)
6. Réservation & commandes
7. Paiements (multi-provider)
8. Dashboard prestataire
9. Back-office admin
10. Communication temps réel
11. Fonctionnalités IA
12. Durcissement production & finalisation

Voir le suivi détaillé de chaque phase dans les rapports correspondants.
