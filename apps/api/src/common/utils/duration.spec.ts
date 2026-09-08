import { describe, expect, it } from 'vitest';
import { durationToMs } from './duration';

describe('durationToMs', () => {
  it.each([
    ['15m', 15 * 60_000],
    ['30d', 30 * 86_400_000],
    ['1h', 3_600_000],
    ['45s', 45_000],
  ])('parses %s', (input, expected) => {
    expect(durationToMs(input)).toBe(expected);
  });

  it('throws on an invalid format', () => {
    expect(() => durationToMs('not-a-duration')).toThrow();
  });
});
