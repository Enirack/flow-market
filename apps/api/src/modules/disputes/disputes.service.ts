import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AdminListDisputesDto } from './dto/admin-list-disputes.dto';
import type { CreateDisputeDto } from './dto/create-dispute.dto';
import type { ResolveDisputeDto } from './dto/resolve-dispute.dto';

const DISPUTABLE_BOOKING_STATUSES = new Set(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']);

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDisputeDto) {
    const booking = await this.prisma.client.booking.findUnique({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    const isParticipant = booking.clientId === userId || provider?.id === booking.providerId;
    if (!isParticipant) throw new ForbiddenException('You do not have access to this booking');

    if (!DISPUTABLE_BOOKING_STATUSES.has(booking.status)) {
      throw new BadRequestException('This booking cannot be disputed in its current state');
    }

    const [dispute] = await this.prisma.client.$transaction([
      this.prisma.client.dispute.create({
        data: { bookingId: booking.id, raisedByUserId: userId, reason: dto.reason, details: dto.details ?? null },
      }),
      this.prisma.client.booking.update({ where: { id: booking.id }, data: { status: 'DISPUTED' } }),
    ]);

    return dispute;
  }

  async adminList(dto: AdminListDisputesDto) {
    const where = dto.status ? { status: dto.status } : {};

    const [disputes, total] = await Promise.all([
      this.prisma.client.dispute.findMany({
        where,
        include: {
          booking: { include: { client: { include: { profile: true } }, provider: true } },
          raisedBy: { include: { profile: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.client.dispute.count({ where }),
    ]);

    return { disputes, total, page: dto.page, totalPages: Math.max(1, Math.ceil(total / dto.limit)) };
  }

  async adminResolve(disputeId: string, dto: ResolveDisputeDto, adminId: string) {
    const dispute = await this.prisma.client.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status === 'RESOLVED' || dispute.status === 'REJECTED') {
      throw new BadRequestException('This dispute has already been closed');
    }

    const [updated] = await this.prisma.client.$transaction([
      this.prisma.client.dispute.update({
        where: { id: disputeId },
        data: {
          status: dto.status,
          resolution: dto.resolution,
          resolvedByUserId: adminId,
          resolvedAt: new Date(),
        },
      }),
      // Une prestation contestee redevient "terminee" une fois le litige tranche
      // (accepte ou rejete) : le litige lui-meme reste trace sur son propre statut.
      this.prisma.client.booking.update({ where: { id: dispute.bookingId }, data: { status: 'COMPLETED' } }),
    ]);

    return updated;
  }
}
