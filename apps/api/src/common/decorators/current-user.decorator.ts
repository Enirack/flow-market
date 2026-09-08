import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload } from '@flowmarket/auth';

export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

/** Injecte l'utilisateur authentifié (payload du access token) dans un handler de route. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error('CurrentUser decorator used outside of an authenticated route');
    }
    return request.user;
  },
);
