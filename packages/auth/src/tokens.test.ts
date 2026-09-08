import { describe, expect, it } from 'vitest';
import { generateOpaqueToken, hashOpaqueToken } from './tokens';

describe('opaque tokens', () => {
  it('generates unique tokens', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
  });

  it('hashes deterministically', () => {
    const token = generateOpaqueToken();
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
  });

  it('produces a different hash for a different token', () => {
    expect(hashOpaqueToken(generateOpaqueToken())).not.toBe(hashOpaqueToken(generateOpaqueToken()));
  });
});
