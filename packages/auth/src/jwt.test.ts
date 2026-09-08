import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from './jwt';

const options = { secret: 'test-secret-key-for-unit-tests', expiresIn: '15m' };

describe('access tokens', () => {
  it('round-trips a signed token', async () => {
    const token = await signAccessToken(
      { sub: 'user-1', email: 'a@b.com', role: 'CLIENT' },
      options,
    );
    const payload = await verifyAccessToken(token, options.secret);
    expect(payload).toEqual({ sub: 'user-1', email: 'a@b.com', role: 'CLIENT' });
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signAccessToken(
      { sub: 'user-1', email: 'a@b.com', role: 'CLIENT' },
      options,
    );
    await expect(verifyAccessToken(token, 'a-different-secret')).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await signAccessToken(
      { sub: 'user-1', email: 'a@b.com', role: 'CLIENT' },
      { ...options, expiresIn: '-1s' },
    );
    await expect(verifyAccessToken(token, options.secret)).rejects.toThrow();
  });
});
