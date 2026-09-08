import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('Password123!');
    await expect(verifyPassword(hash, 'Password123!')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('Password123!');
    await expect(verifyPassword(hash, 'WrongPassword!')).resolves.toBe(false);
  });

  it('produces a different hash for the same password each time (salted)', async () => {
    const [a, b] = await Promise.all([hashPassword('Password123!'), hashPassword('Password123!')]);
    expect(a).not.toBe(b);
  });
});
