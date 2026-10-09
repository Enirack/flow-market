# Sécurité

Ce document recense les pratiques de sécurité réellement implémentées dans
FlowMarket, par domaine. Il reflète l'état du code — pas un objectif à
atteindre — et doit être mis à jour à chaque changement qui l'affecte.

## Authentification & autorisation

- **Mots de passe** : hachés avec Argon2id (`packages/auth/src/password.ts`),
  l'algorithme recommandé par l'OWASP. Jamais stockés ni loggés en clair.
- **Tokens d'accès** : JWT signés (HS256) de courte durée (15 min par
  défaut, `JWT_ACCESS_EXPIRES_IN`), transmis en en-tête `Authorization:
  Bearer`.
- **Tokens de rafraîchissement et de vérification** : opaques (aléatoires,
  non-JWT), stockés en base **sous forme hachée** uniquement
  (`hashOpaqueToken`) — une fuite de la base ne permet pas de les rejouer
  directement.
- **Garde d'accès par défaut (deny-by-default)** : `JwtAuthGuard` est
  enregistré globalement (`app.module.ts`) et rejette toute requête sans
  token valide ; une route doit explicitement s'en exclure via `@Public()`.
  `RolesGuard` applique ensuite le contrôle par rôle (`@Roles('ADMIN')`,
  etc.) selon le même principe.
- **Énumération de comptes** : `forgotPassword` ne révèle jamais si un email
  existe (retour identique dans les deux cas) et n'attend pas l'envoi réel
  de l'email (fire-and-forget) pour éviter une fuite par timing entre un
  compte existant et inexistant.
- **Suspension de compte** : un utilisateur `SUSPENDED` est rejeté dès la
  connexion (`login`), avant même l'émission de tokens.

## Entrées utilisateur

- **Validation stricte globale** : `ValidationPipe({ whitelist: true,
  forbidNonWhitelisted: true, transform: true })` sur toute l'API — tout
  champ non déclaré dans un DTO est rejeté (protection contre le mass
  assignment), les types sont coercés et validés via `class-validator`.
- **Modération de contenu (Phase 11)** : les descriptions de service et les
  commentaires d'avis sont analysés à la création (`AiService.moderateText`)
  et rejetés s'ils contiennent un langage inapproprié, du spam, ou une
  tentative de contournement de la plateforme (ex. partage de coordonnées
  de contact pour échapper aux frais).
- **Emails HTML** : toute donnée utilisateur interpolée dans un email
  (noms, motifs de litige, commentaires d'avis) est échappée
  (`escapeHtml`, `apps/api/src/notifications/templates.ts`) avant insertion
  dans le HTML, pour empêcher l'injection de markup dans les emails envoyés
  à d'autres utilisateurs.

## Transport & en-têtes HTTP

- **Helmet** appliqué globalement (`main.ts`) : CSP, `X-Frame-Options`,
  `X-Content-Type-Options`, HSTS, etc.
- **CORS** restreint à la liste explicite `CORS_ORIGINS` (aucune origine par
  défaut), avec `credentials: true` pour le cookie de refresh token.
- **Cookies** : le refresh token est transmis en cookie `httpOnly` (non
  accessible en JavaScript côté client), limitant l'impact d'un XSS.

## Rate limiting

`ThrottlerGuard` global (`@nestjs/throttler`) : 100 requêtes / 60 secondes
par IP sur l'ensemble de l'API, appliqué par défaut à toutes les routes
(y compris connexion et inscription, pour limiter le brute-force).

## Paiements

- **Vérification des webhooks** : chaque provider est validé selon son
  mécanisme propre avant toute confiance accordée au payload —
  - Stripe : signature HMAC-SHA256 (`Stripe-Signature`), horodatage vérifié.
  - Flutterwave : en-tête `verif-hash` comparé en **temps constant**
    (`crypto.timingSafeEqual`, `packages/payments/src/providers/flutterwave.provider.ts`)
    pour éviter une attaque par timing, **puis** la transaction est
    revérifiée auprès de l'API Flutterwave (`/transactions/:id/verify`)
    avant d'en accepter le montant/statut — le webhook ne sert que de
    déclencheur, jamais de source de vérité.
  - CinetPay / PayDunya : même principe de défense en profondeur (pas de
    signature HMAC fournie par le provider ; le statut autoritaire est
    obtenu en rappelant leur API de vérification).
- **Idempotence** : chaque intention de paiement et virement porte une
  `idempotencyKey` dérivée de l'identifiant interne (commande, tentative,
  virement) pour éviter les doubles encaissements/virements en cas de
  retry.
- **Déduplication des événements webhook** : `paymentTransaction` enregistre
  `providerEventId` et court-circuite le traitement si l'événement a déjà
  été appliqué.
- **Mode mock** : le provider `MOCK` ne peut être utilisé que lorsque
  `PAYMENT_PROVIDER_MODE=mock` (défaut en développement) ; l'API refuse
  explicitement ce provider si `PAYMENT_PROVIDER_MODE=live`.

## Fonctionnalités IA (Phase 11)

- Mode dev par défaut (`AI_API_KEY` vide) : aucune donnée utilisateur n'est
  envoyée à un service tiers tant que la fonctionnalité n'est pas
  explicitement configurée avec une clé API en production.
- Un échec de l'appel IA (quelle qu'en soit la cause) retombe sur une
  heuristique locale plutôt que de bloquer ou de faire échouer la requête
  métier — la disponibilité du service ne dépend jamais de celle du
  fournisseur IA.

## Secrets & configuration

- **Validation au démarrage** : toute la configuration passe par un schéma
  Zod (`apps/api/src/config/env.validation.ts`) — l'application refuse de
  démarrer si une variable requise est absente ou mal formée, plutôt que de
  démarrer dans un état partiellement configuré.
- **`.env` jamais versionné** (`.gitignore`), uniquement `.env.example` avec
  des valeurs vides ou des placeholders explicites.
- **Logs** : `nestjs-pino` ; aucun secret (mot de passe, token, clé API)
  n'est intentionnellement loggé. Les tokens de vérification/réinitialisation
  ne sont loggés qu'en mode dev explicite (`SMTP_HOST` vide), jamais en
  production où ils ne transitent que par email.

## Dépendances

- `pnpm audit` est exécuté régulièrement (voir `docs/deployment.md` pour
  son intégration CI) ; les vulnérabilités sur des dépendances transitives
  que les paquets amont n'ont pas encore corrigées sont neutralisées via
  `pnpm-workspace.yaml` → `overrides` plutôt que laissées en l'état.
- Les mises à jour de version majeure (Next.js, NestJS, Prisma) sont
  appliquées dès qu'un correctif de sécurité est publié pour la version en
  cours d'utilisation.

## Ce qui reste hors périmètre (connu, à traiter avant une mise en
production à fort trafic)

- Pas de WAF / protection anti-DDoS au niveau infrastructure (à ajouter via
  le reverse proxy / CDN de production, hors du code applicatif).
- Pas de rotation automatique des secrets (`JWT_ACCESS_SECRET`, clés API) —
  rotation manuelle documentée dans `docs/deployment.md`.
- Pas de scan de dépendances automatisé en CI (Dependabot/Renovate ou
  équivalent) — `pnpm audit` est aujourd'hui exécuté manuellement.
