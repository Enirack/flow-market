import { createHash, randomBytes } from 'node:crypto';

/** Génère un token opaque (refresh token, vérification email, reset mot de passe). */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Hash déterministe (SHA-256) — seul le hash est stocké en base, jamais le token en clair. */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
