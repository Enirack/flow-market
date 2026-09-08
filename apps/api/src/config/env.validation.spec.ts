import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'test-secret-key-of-sufficient-length',
    MEILI_MASTER_KEY: 'test-master-key',
  };

  it('applies defaults for optional variables', () => {
    const env = validateEnv(base);
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(4000);
  });

  it('throws when a required variable is missing', () => {
    expect(() => validateEnv({ REDIS_URL: base.REDIS_URL })).toThrow(/DATABASE_URL/);
  });

  it('coerces API_PORT to a number', () => {
    const env = validateEnv({ ...base, API_PORT: '5000' });
    expect(env.API_PORT).toBe(5000);
  });
});
