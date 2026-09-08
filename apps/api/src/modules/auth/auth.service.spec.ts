import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '@flowmarket/auth';
import type { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';

function createPrismaMock() {
  return {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    verificationToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((operations: unknown[]) => Promise.all(operations)),
  };
}

describe('AuthService', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let service: AuthService;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-secret-key-for-unit-tests-only';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';
  });

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new AuthService({ client: prismaMock } as unknown as PrismaService);
  });

  describe('register', () => {
    it('creates a user and returns tokens without exposing the password hash', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@flowmarket.dev',
        role: 'CLIENT',
        emailVerifiedAt: null,
      });
      prismaMock.verificationToken.create.mockResolvedValue({});
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'new@flowmarket.dev',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result.user.email).toBe('new@flowmarket.dev');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it('throws when the email is already registered', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'existing@flowmarket.dev',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Doe',
        }),
      ).rejects.toThrow('An account with this email already exists');
    });
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@flowmarket.dev', password: 'x' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('rejects an incorrect password', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        passwordHash: await hashPassword('CorrectPassword123'),
        role: 'CLIENT',
        status: 'ACTIVE',
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'WrongPassword123' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('rejects a suspended account even with the correct password', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        passwordHash: await hashPassword('CorrectPassword123'),
        role: 'CLIENT',
        status: 'SUSPENDED',
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'CorrectPassword123' }),
      ).rejects.toThrow('This account is not active');
    });

    it('issues tokens for valid, active credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.com',
        passwordHash: await hashPassword('CorrectPassword123'),
        role: 'CLIENT',
        status: 'ACTIVE',
        emailVerifiedAt: null,
      });
      prismaMock.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'a@b.com', password: 'CorrectPassword123' });

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.user.id).toBe('user-1');
    });
  });

  describe('refresh', () => {
    it('rejects a refresh token that does not exist', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('rejects a revoked refresh token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100_000),
        user: { id: 'user-1', email: 'a@b.com', role: 'CLIENT' },
      });

      await expect(service.refresh('revoked-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });

  describe('changePassword', () => {
    it('rejects when the current password is wrong', async () => {
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        passwordHash: await hashPassword('CorrectPassword123'),
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123',
        }),
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});
