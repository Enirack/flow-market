import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.client.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { service: { include: { images: { take: 1, orderBy: { position: 'asc' } } } } },
    });
  }

  async add(userId: string, serviceId: string) {
    const service = await this.prisma.client.service.findUnique({ where: { id: serviceId } });
    if (!service || service.status !== 'PUBLISHED') {
      throw new NotFoundException('Service not found');
    }

    return this.prisma.client.favorite.upsert({
      where: { userId_serviceId: { userId, serviceId } },
      create: { userId, serviceId },
      update: {},
    });
  }

  async remove(userId: string, serviceId: string): Promise<void> {
    await this.prisma.client.favorite.deleteMany({ where: { userId, serviceId } });
  }
}
