import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type { AdminListProvidersDto } from './dto/admin-list-providers.dto';
import type { CreateProviderDto } from './dto/create-provider.dto';
import type { ReviewVerificationDto } from './dto/review-verification.dto';
import type { UpdateProviderDto } from './dto/update-provider.dto';

const PROFILE_CACHE_TTL_SECONDS = 60;

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onboard(userId: string, dto: CreateProviderDto) {
    const [existingForUser, existingSlug] = await Promise.all([
      this.prisma.client.provider.findUnique({ where: { userId } }),
      this.prisma.client.provider.findUnique({ where: { slug: dto.slug } }),
    ]);

    if (existingForUser) {
      throw new ConflictException('This account already has a provider profile');
    }
    if (existingSlug) {
      throw new ConflictException('This slug is already taken');
    }

    const [provider] = await this.prisma.client.$transaction([
      this.prisma.client.provider.create({
        data: {
          userId,
          businessName: dto.businessName,
          slug: dto.slug,
          bio: dto.bio ?? null,
          verification: { create: { status: 'PENDING', documents: [] } },
          balance: { create: {} },
        },
      }),
      this.prisma.client.user.update({ where: { id: userId }, data: { role: 'PROVIDER' } }),
    ]);

    return provider;
  }

  async getBySlug(slug: string) {
    const cacheKey = `provider:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const provider = await this.prisma.client.provider.findUnique({
      where: { slug },
      include: {
        user: { include: { profile: true } },
        services: {
          where: { status: 'PUBLISHED' },
          include: { images: { orderBy: { position: 'asc' }, take: 1 }, category: true },
        },
        availabilities: { where: { type: 'RECURRING' } },
      },
    });

    if (!provider || !provider.isActive) {
      throw new NotFoundException('Provider not found');
    }

    await this.redis.set(cacheKey, provider, PROFILE_CACHE_TTL_SECONDS);
    return provider;
  }

  async getMe(userId: string) {
    const provider = await this.prisma.client.provider.findUnique({
      where: { userId },
      include: { verification: true, balance: true },
    });
    if (!provider) throw new NotFoundException('No provider profile for this account');
    return provider;
  }

  async updateMe(userId: string, dto: UpdateProviderDto) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) {
      throw new NotFoundException('No provider profile for this account');
    }

    return this.prisma.client.provider.update({ where: { userId }, data: dto });
  }

  async getMyStats(userId: string) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('No provider profile for this account');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [revenue, upcomingBookings, publishedServices] = await Promise.all([
      this.prisma.client.payment.aggregate({
        where: {
          status: 'SUCCEEDED',
          createdAt: { gte: thirtyDaysAgo },
          order: { booking: { providerId: provider.id } },
        },
        _sum: { amount: true },
      }),
      this.prisma.client.booking.count({
        where: {
          providerId: provider.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          scheduledAt: { gte: new Date() },
        },
      }),
      this.prisma.client.service.count({ where: { providerId: provider.id, status: 'PUBLISHED' } }),
    ]);

    return {
      revenue30d: revenue._sum.amount ?? 0,
      upcomingBookings,
      publishedServices,
      ratingAvg: provider.ratingAvg,
      ratingCount: provider.ratingCount,
    };
  }

  async getRecentBookings(userId: string, limit = 5) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('No provider profile for this account');

    return this.prisma.client.booking.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { items: { include: { service: true } }, client: { include: { profile: true } } },
    });
  }

  async adminList(dto: AdminListProvidersDto) {
    const where = dto.verificationStatus ? { verification: { status: dto.verificationStatus } } : {};

    const [providers, total] = await Promise.all([
      this.prisma.client.provider.findMany({
        where,
        include: { user: { include: { profile: true } }, verification: true, balance: true },
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.client.provider.count({ where }),
    ]);

    return {
      providers,
      total,
      page: dto.page,
      totalPages: Math.max(1, Math.ceil(total / dto.limit)),
    };
  }

  async reviewVerification(providerId: string, dto: ReviewVerificationDto, adminId: string) {
    const verification = await this.prisma.client.providerVerification.findUnique({
      where: { providerId },
    });
    if (!verification) {
      throw new NotFoundException('No verification request for this provider');
    }

    return this.prisma.client.providerVerification.update({
      where: { providerId },
      data: {
        status: dto.status,
        rejectionReason: dto.status === 'REJECTED' ? (dto.rejectionReason ?? null) : null,
        reviewedAt: new Date(),
        reviewedByUserId: adminId,
      },
    });
  }
}
