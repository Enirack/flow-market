import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import type { AdminListReviewsDto } from './dto/admin-list-reviews.dto';
import type { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(clientId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.client.booking.findUnique({
      where: { id: dto.bookingId },
      include: { items: { include: { service: true } }, provider: true, client: { include: { profile: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== clientId) {
      throw new ForbiddenException('This booking does not belong to your account');
    }
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('Only a completed booking can be reviewed');
    }

    const existing = await this.prisma.client.review.findUnique({ where: { bookingId: booking.id } });
    if (existing) throw new ConflictException('This booking has already been reviewed');

    const review = await this.prisma.client.review.create({
      data: {
        bookingId: booking.id,
        clientId,
        providerId: booking.providerId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
    });

    await this.recomputeProviderRating(booking.providerId);

    const clientProfile = booking.client.profile;
    void this.notifications.notify(booking.provider.userId, 'NEW_REVIEW', {
      serviceTitle: booking.items[0]?.service.title ?? 'votre prestation',
      rating: dto.rating,
      comment: dto.comment ?? null,
      clientName: clientProfile ? `${clientProfile.firstName} ${clientProfile.lastName}` : 'Un client',
    });

    return review;
  }

  async adminList(dto: AdminListReviewsDto) {
    const where = { deletedAt: null };

    const [reviews, total] = await Promise.all([
      this.prisma.client.review.findMany({
        where,
        include: { client: { include: { profile: true } }, provider: true },
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.client.review.count({ where }),
    ]);

    return { reviews, total, page: dto.page, totalPages: Math.max(1, Math.ceil(total / dto.limit)) };
  }

  async adminHide(reviewId: string) {
    const review = await this.prisma.client.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.client.review.update({
      where: { id: reviewId },
      data: { deletedAt: new Date() },
    });

    await this.recomputeProviderRating(review.providerId);
    return updated;
  }

  private async recomputeProviderRating(providerId: string): Promise<void> {
    const stats = await this.prisma.client.review.aggregate({
      where: { providerId, deletedAt: null },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.client.provider.update({
      where: { id: providerId },
      data: {
        ratingAvg: stats._avg.rating ? Number(stats._avg.rating.toFixed(2)) : 0,
        ratingCount: stats._count,
      },
    });
  }
}
