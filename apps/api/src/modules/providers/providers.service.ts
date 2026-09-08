import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CreateProviderDto } from './dto/create-provider.dto';
import type { ReviewVerificationDto } from './dto/review-verification.dto';
import type { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const provider = await this.prisma.client.provider.findUnique({
      where: { slug },
      include: { user: { include: { profile: true } } },
    });

    if (!provider || !provider.isActive) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async updateMe(userId: string, dto: UpdateProviderDto) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) {
      throw new NotFoundException('No provider profile for this account');
    }

    return this.prisma.client.provider.update({ where: { userId }, data: dto });
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
