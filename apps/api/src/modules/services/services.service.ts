import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SearchService, type ServiceSearchDocument } from '../../search/search.service';
import type { SearchServicesDto } from './dto/search-services.dto';

const DETAIL_CACHE_TTL_SECONDS = 60;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly redis: RedisService,
  ) {}

  async search(dto: SearchServicesDto) {
    return this.searchService.searchServices({
      ...(dto.q ? { q: dto.q } : {}),
      ...(dto.category ? { categorySlug: dto.category } : {}),
      ...(dto.sort ? { sort: dto.sort } : {}),
      page: dto.page,
      limit: dto.limit,
    });
  }

  async getBySlug(slug: string) {
    const cacheKey = `service:${slug}`;
    const cached =
      await this.redis.get<Awaited<ReturnType<typeof this.loadServiceDetail>>>(cacheKey);
    if (cached) return cached;

    const detail = await this.loadServiceDetail(slug);
    await this.redis.set(cacheKey, detail, DETAIL_CACHE_TTL_SECONDS);
    return detail;
  }

  private async loadServiceDetail(slug: string) {
    const service = await this.prisma.client.service.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { position: 'asc' } },
        options: true,
        category: true,
        provider: { include: { user: { include: { profile: true } } } },
      },
    });

    if (!service || service.status !== 'PUBLISHED') {
      throw new NotFoundException('Service not found');
    }

    const [ratingStats, reviews] = await Promise.all([
      this.getServiceRatingStats(service.id),
      this.getRecentReviews(service.id),
    ]);

    return { ...service, rating: ratingStats, reviews };
  }

  private getServiceRatingStats(serviceId: string) {
    return this.prisma.client.review
      .aggregate({
        where: { booking: { items: { some: { serviceId } } }, deletedAt: null },
        _avg: { rating: true },
        _count: true,
      })
      .then((result) => ({
        average: result._avg.rating ? Number(result._avg.rating.toFixed(1)) : 0,
        count: result._count,
      }));
  }

  private getRecentReviews(serviceId: string) {
    return this.prisma.client.review.findMany({
      where: { booking: { items: { some: { serviceId } } }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { client: { include: { profile: true } } },
    });
  }

  /** Reconstruit l'index Meilisearch à partir des services publiés en base. */
  async reindexAll(): Promise<number> {
    const services = await this.prisma.client.service.findMany({
      where: { status: 'PUBLISHED' },
      include: { category: true, provider: { include: { user: { include: { profile: true } } } } },
    });

    const docs: ServiceSearchDocument[] = await Promise.all(
      services.map(async (service) => {
        const stats = await this.getServiceRatingStats(service.id);
        return {
          id: service.id,
          slug: service.slug,
          title: service.title,
          description: service.description,
          category: service.category.name,
          categorySlug: service.category.slug,
          providerId: service.providerId,
          providerName: service.provider.businessName,
          providerSlug: service.provider.slug,
          price: Number(service.basePrice),
          currency: service.currency,
          rating: stats.average,
          reviewCount: stats.count,
          createdAt: service.createdAt.getTime(),
        };
      }),
    );

    return this.searchService.reindexAll(docs);
  }
}
