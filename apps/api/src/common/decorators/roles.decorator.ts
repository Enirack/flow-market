import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@flowmarket/types';

export const ROLES_KEY = 'roles';

/** Restreint une route aux rôles listés. Nécessite que JwtAuthGuard ait déjà authentifié la requête. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
