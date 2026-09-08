import { jwtVerify, SignJWT } from 'jose';
import type { UserRole } from '@flowmarket/types';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface SignAccessTokenOptions {
  secret: string;
  expiresIn: string;
}

export async function signAccessToken(
  payload: AccessTokenPayload,
  { secret, expiresIn }: SignAccessTokenOptions,
): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    throw new Error('Invalid access token payload');
  }

  return { sub: payload.sub, email: payload.email, role: payload.role as UserRole };
}
