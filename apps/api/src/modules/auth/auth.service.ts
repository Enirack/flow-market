import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  generateOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  signAccessToken,
  verifyPassword,
} from '@flowmarket/auth';
import type { UserRole } from '@flowmarket/types';
import { PrismaService } from '../../database/prisma.service';
import { durationToMs } from '../../common/utils/duration';
import { NotificationsService } from '../../notifications/notifications.service';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { VerifyEmailDto } from './dto/verify-email.dto';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  emailVerifiedAt: Date | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser } & AuthTokens> {
    const existing = await this.prisma.client.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.client.user.create({
      data: {
        email: dto.email,
        passwordHash,
        profile: { create: { firstName: dto.firstName, lastName: dto.lastName } },
      },
    });

    await this.issueEmailVerificationToken(user.id, user.email, dto.firstName);

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser } & AuthTokens> {
    const user = await this.prisma.client.user.findUnique({ where: { email: dto.email } });

    if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is not active');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = hashOpaqueToken(refreshToken);
    const existing = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.client.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(existing.user.id, existing.user.email, existing.user.role);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashOpaqueToken(refreshToken);
    await this.prisma.client.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });
    if (!user) {
      // Ne jamais révéler si l'email existe ou non.
      return;
    }

    const token = generateOpaqueToken();
    await this.prisma.client.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashOpaqueToken(token),
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + durationToMs('1h')),
      },
    });

    // Fire-and-forget : attendre l'envoi reel introduirait un ecart de temps de
    // reponse entre un email connu et un email inconnu (enumeration de comptes).
    void this.notifications.sendAuthEmail(user.email, user.profile?.firstName ?? 'là', 'reset', token);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const verification = await this.consumeVerificationToken(dto.token, 'PASSWORD_RESET');
    const passwordHash = await hashPassword(dto.newPassword);

    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: verification.userId },
        data: { passwordHash },
      }),
      this.prisma.client.refreshToken.updateMany({
        where: { userId: verification.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.client.user.findUniqueOrThrow({ where: { id: userId } });

    if (!(await verifyPassword(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await hashPassword(dto.newPassword);

    await this.prisma.client.$transaction([
      this.prisma.client.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.client.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const verification = await this.consumeVerificationToken(dto.token, 'EMAIL_VERIFICATION');
    await this.prisma.client.user.update({
      where: { id: verification.userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  private async issueEmailVerificationToken(userId: string, email: string, firstName: string): Promise<void> {
    const token = generateOpaqueToken();
    await this.prisma.client.verificationToken.create({
      data: {
        userId,
        tokenHash: hashOpaqueToken(token),
        purpose: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + durationToMs('24h')),
      },
    });
    // Fire-and-forget : ne doit jamais ralentir ou faire echouer l'inscription.
    void this.notifications.sendAuthEmail(email, firstName, 'verify', token);
  }

  private async consumeVerificationToken(
    rawToken: string,
    purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  ) {
    const tokenHash = hashOpaqueToken(rawToken);
    const verification = await this.prisma.client.verificationToken.findUnique({
      where: { tokenHash },
    });

    if (
      !verification ||
      verification.purpose !== purpose ||
      verification.consumedAt ||
      verification.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.prisma.client.verificationToken.update({
      where: { id: verification.id },
      data: { consumedAt: new Date() },
    });

    return verification;
  }

  private async issueTokens(userId: string, email: string, role: UserRole): Promise<AuthTokens> {
    const accessToken = await signAccessToken(
      { sub: userId, email, role },
      {
        secret: process.env.JWT_ACCESS_SECRET!,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      },
    );

    const refreshToken = generateOpaqueToken();
    const refreshTokenExpiresAt = new Date(
      Date.now() + durationToMs(process.env.JWT_REFRESH_EXPIRES_IN ?? '30d'),
    );

    await this.prisma.client.refreshToken.create({
      data: {
        userId,
        tokenHash: hashOpaqueToken(refreshToken),
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return { accessToken, refreshToken, refreshTokenExpiresAt };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    role: UserRole;
    emailVerifiedAt: Date | null;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }
}
