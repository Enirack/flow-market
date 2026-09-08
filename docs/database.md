# Base de données

PostgreSQL + Prisma (générateur `prisma-client`, Prisma 7). Schéma dans
[`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma).

## Domaines

| Domaine                    | Entités                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| Identité                   | `User`, `Profile`, `Provider`, `ProviderVerification`                  |
| Catalogue                  | `Category`, `Service`, `ServiceImage`, `ServiceOption`, `Availability` |
| Réservation & commande     | `Booking`, `BookingItem`, `Order`, `OrderItem`                         |
| Paiements                  | `Payment`, `PaymentTransaction`, `Refund`, `ProviderBalance`, `Payout` |
| Abonnements & promotions   | `SubscriptionPlan`, `Subscription`, `Coupon`                           |
| Avis                       | `Review`                                                               |
| Messagerie & notifications | `Conversation`, `Message`, `Notification`                              |
| Modération & audit         | `Report`, `Dispute`, `AuditLog`                                        |

## Décisions de modélisation

- **UUID** (`@db.Uuid`) comme identifiant sur toutes les tables, `createdAt`/`updatedAt` systématiques.
- **Montants en `Decimal(12,2)`**, jamais en `Float`, pour éviter les erreurs d'arrondi sur les données financières. Devise (`currency`) stockée à côté de chaque montant (défaut `XOF`).
- **Séparation Profile / Provider** : `Profile` porte l'identité personnelle commune à tous les rôles, `Provider` porte les données professionnelles (note, activité, vérification) — évite de polluer `User` avec des champs qui ne concernent qu'un sous-ensemble des utilisateurs.
- **Order distinct de Booking** : `Booking` décrit ce qui a été réservé (service, créneau), `Order` décrit ce qui a été facturé (sous-total, remise, commission, montant prestataire) — permet d'appliquer un coupon ou de recalculer la répartition sans toucher à la réservation elle-même.
- **`PaymentTransaction` en append-only** : chaque événement webhook reçu d'un provider de paiement est enregistré individuellement (`providerEventId` unique par paiement) pour l'auditabilité et la déduplication des webhooks — jamais de mise à jour destructive de l'historique.
- **`Availability` polymorphe** (`type: RECURRING | EXCEPTION`) : une seule table couvre à la fois les créneaux récurrents hebdomadaires et les blocages ponctuels, évitant une entité supplémentaire non demandée.
- **Soft delete ciblé** : uniquement sur `User` (suppression de compte), `Review` et `Message` (modération) — les autres entités utilisent déjà un champ `status`/`isActive` qui couvre le même besoin sans dupliquer le mécanisme.
- **Index** posés sur les clés étrangères et champs de filtrage fréquents (statuts, dates de planification, recherche par catégorie/slug).

## Commandes utiles

```bash
pnpm --filter @flowmarket/database run generate      # régénère le client Prisma
pnpm --filter @flowmarket/database run migrate:dev    # nouvelle migration en dev
pnpm --filter @flowmarket/database run migrate:deploy # applique les migrations (CI/prod)
pnpm --filter @flowmarket/database run seed           # jeu de données de démonstration
pnpm --filter @flowmarket/database run studio         # explorateur de données Prisma Studio
```

Le jeu de données de démonstration (`prisma/seed.ts`) crée un admin, un client, un
prestataire avec 2 services publiés, un abonnement PRO, un booking terminé avec
commande, paiement et avis. Identifiants : `admin@flowmarket.dev` /
`client@flowmarket.dev` / `provider@flowmarket.dev`, mot de passe `Password123!`
(hashé avec Argon2 via `@flowmarket/auth`, comme en production).
