import { randomBytes } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { slugify } from '../../common/utils/slugify.util';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SearchService, type ServiceSearchDocument } from '../../search/search.service';
import type { AddServiceImageDto } from './dto/add-service-image.dto';
import type { AdminListServicesDto } from './dto/admin-list-services.dto';
import type { CreateServiceOptionDto } from './dto/create-service-option.dto';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { SearchServicesDto } from './dto/search-services.dto';
import type { UpdateServiceDto } from './dto/update-service.dto';

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

    const docs = await Promise.all(services.map((service) => this.toSearchDocument(service)));
    return this.searchService.reindexAll(docs);
  }

  async adminList(dto: AdminListServicesDto) {
    const where = dto.status ? { status: dto.status } : {};

    const [services, total] = await Promise.all([
      this.prisma.client.service.findMany({
        where,
        include: { category: true, provider: true },
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.client.service.count({ where }),
    ]);

    return {
      services,
      total,
      page: dto.page,
      totalPages: Math.max(1, Math.ceil(total / dto.limit)),
    };
  }

  async adminUnpublish(serviceId: string) {
    const service = await this.prisma.client.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');

    const updated = await this.prisma.client.service.update({
      where: { id: serviceId },
      data: { status: 'ARCHIVED' },
    });

    await this.searchService.removeService(serviceId);
    await this.invalidateDetailCache(service.slug);
    return updated;
  }

  async listMine(userId: string) {
    const provider = await this.getProviderOrThrow(userId);
    return this.prisma.client.service.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { position: 'asc' } }, options: true, category: true },
    });
  }

  async create(userId: string, dto: CreateServiceDto) {
    const provider = await this.getProviderOrThrow(userId);
    const category = await this.prisma.client.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Unknown category');

    const slug = await this.generateUniqueSlug(dto.title);

    return this.prisma.client.service.create({
      data: {
        providerId: provider.id,
        categoryId: dto.categoryId,
        title: dto.title,
        slug,
        description: dto.description,
        priceType: dto.priceType,
        basePrice: dto.basePrice,
        currency: dto.currency ?? 'XOF',
        durationMinutes: dto.durationMinutes ?? null,
      },
      include: { images: true, options: true, category: true },
    });
  }

  async update(userId: string, serviceId: string, dto: UpdateServiceDto) {
    const service = await this.getOwnedService(userId, serviceId);

    if (dto.categoryId) {
      const category = await this.prisma.client.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException('Unknown category');
    }

    const updated = await this.prisma.client.service.update({
      where: { id: service.id },
      data: {
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description ? { description: dto.description } : {}),
        ...(dto.priceType ? { priceType: dto.priceType } : {}),
        ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
      },
      include: { images: true, options: true, category: true },
    });

    if (updated.status === 'PUBLISHED') {
      await this.reindexPublished(updated.id);
      await this.invalidateDetailCache(updated.slug);
    }

    return updated;
  }

  async publish(userId: string, serviceId: string) {
    const service = await this.getOwnedService(userId, serviceId);
    if (service.images.length === 0) {
      throw new BadRequestException('Add at least one image before publishing');
    }

    const updated = await this.prisma.client.service.update({
      where: { id: service.id },
      data: { status: 'PUBLISHED' },
      include: { images: true, options: true, category: true, provider: true },
    });

    await this.searchService.indexService(await this.toSearchDocument(updated));
    return updated;
  }

  async archive(userId: string, serviceId: string) {
    const service = await this.getOwnedService(userId, serviceId);

    const updated = await this.prisma.client.service.update({
      where: { id: service.id },
      data: { status: 'ARCHIVED' },
    });

    await this.searchService.removeService(service.id);
    await this.invalidateDetailCache(service.slug);
    return updated;
  }

  async remove(userId: string, serviceId: string): Promise<void> {
    const service = await this.getOwnedService(userId, serviceId);
    if (service.status !== 'DRAFT') {
      throw new BadRequestException('Only a draft service can be deleted ; archive it instead');
    }

    const bookingCount = await this.prisma.client.bookingItem.count({ where: { serviceId: service.id } });
    if (bookingCount > 0) {
      throw new BadRequestException('This service already has bookings and cannot be deleted');
    }

    await this.prisma.client.service.delete({ where: { id: service.id } });
  }

  async addImage(userId: string, serviceId: string, dto: AddServiceImageDto) {
    const service = await this.getOwnedService(userId, serviceId);
    const position = await this.prisma.client.serviceImage.count({ where: { serviceId: service.id } });

    await this.prisma.client.serviceImage.create({
      data: { serviceId: service.id, url: dto.url, position },
    });
    await this.invalidateDetailCache(service.slug);

    return this.prisma.client.serviceImage.findMany({
      where: { serviceId: service.id },
      orderBy: { position: 'asc' },
    });
  }

  async removeImage(userId: string, serviceId: string, imageId: string): Promise<void> {
    const service = await this.getOwnedService(userId, serviceId);
    const image = await this.prisma.client.serviceImage.findUnique({ where: { id: imageId } });
    if (!image || image.serviceId !== service.id) throw new NotFoundException('Image not found');

    await this.prisma.client.serviceImage.delete({ where: { id: imageId } });
    await this.invalidateDetailCache(service.slug);
  }

  async addOption(userId: string, serviceId: string, dto: CreateServiceOptionDto) {
    const service = await this.getOwnedService(userId, serviceId);

    await this.prisma.client.serviceOption.create({
      data: { serviceId: service.id, name: dto.name, priceDelta: dto.priceDelta },
    });
    await this.invalidateDetailCache(service.slug);

    return this.prisma.client.serviceOption.findMany({ where: { serviceId: service.id } });
  }

  async removeOption(userId: string, serviceId: string, optionId: string): Promise<void> {
    const service = await this.getOwnedService(userId, serviceId);
    const option = await this.prisma.client.serviceOption.findUnique({ where: { id: optionId } });
    if (!option || option.serviceId !== service.id) throw new NotFoundException('Option not found');

    await this.prisma.client.serviceOption.delete({ where: { id: optionId } });
    await this.invalidateDetailCache(service.slug);
  }

  private async reindexPublished(serviceId: string): Promise<void> {
    const service = await this.prisma.client.service.findUniqueOrThrow({
      where: { id: serviceId },
      include: { category: true, provider: true },
    });
    await this.searchService.indexService(await this.toSearchDocument(service));
  }

  private async invalidateDetailCache(slug: string): Promise<void> {
    await this.redis.del(`service:${slug}`);
  }

  private async toSearchDocument(service: {
    id: string;
    slug: string;
    title: string;
    description: string;
    providerId: string;
    basePrice: unknown;
    currency: string;
    createdAt: Date;
    category: { name: string; slug: string };
    provider: { businessName: string; slug: string };
  }): Promise<ServiceSearchDocument> {
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
  }

  private async getProviderOrThrow(userId: string) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('No provider profile for this account');
    return provider;
  }

  private async getOwnedService(userId: string, serviceId: string) {
    const provider = await this.getProviderOrThrow(userId);
    const service = await this.prisma.client.service.findUnique({
      where: { id: serviceId },
      include: { images: { orderBy: { position: 'asc' } }, options: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (service.providerId !== provider.id) {
      throw new ForbiddenException('This service does not belong to your account');
    }
    return service;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'service';
    let candidate = base;
    let attempt = 0;

    while (await this.prisma.client.service.findUnique({ where: { slug: candidate } })) {
      attempt += 1;
      candidate = `${base}-${randomBytes(3).toString('hex')}`;
      if (attempt > 5) break;
    }

    return candidate;
  }
}
