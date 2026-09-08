import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

const CACHE_KEY = 'categories:tree';
const CACHE_TTL_SECONDS = 300;

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getTree() {
    const cached = await this.redis.get(CACHE_KEY);
    if (cached) return cached;

    const categories = await this.prisma.client.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
      include: { children: { orderBy: { name: 'asc' } } },
    });

    await this.redis.set(CACHE_KEY, categories, CACHE_TTL_SECONDS);
    return categories;
  }
}
