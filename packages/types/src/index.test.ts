import { describe, expect, it } from 'vitest';
import type { UserRole } from './index';

describe('UserRole', () => {
  it('accepts the three core platform roles', () => {
    const roles: UserRole[] = ['CLIENT', 'PROVIDER', 'ADMIN'];
    expect(roles).toHaveLength(3);
  });
});
