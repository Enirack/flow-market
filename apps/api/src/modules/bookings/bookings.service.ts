import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PLATFORM_FEE_RATE } from '../../common/constants';
import { PrismaService } from '../../database/prisma.service';
import { hasSchedulingConflict } from '../../common/utils/booking-conflict.util';
import { ACTIVE_BOOKING_STATUSES, AvailabilityService } from '../availability/availability.service';
import { PaymentsService } from '../payments/payments.service';
import type { CancelBookingDto } from './dto/cancel-booking.dto';
import type { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly payments: PaymentsService,
  ) {}

  async create(clientId: string, dto: CreateBookingDto) {
    const service = await this.prisma.client.service.findUnique({
      where: { id: dto.serviceId },
      include: { options: true },
    });

    if (!service || service.status !== 'PUBLISHED') {
      throw new NotFoundException('Service not found');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('scheduledAt must be a valid date in the future');
    }

    const durationMinutes = service.durationMinutes ?? 60;

    const selectedOptions = service.options.filter((option) => dto.optionIds?.includes(option.id));
    if (dto.optionIds && selectedOptions.length !== dto.optionIds.length) {
      throw new BadRequestException('One or more selected options do not belong to this service');
    }

    const isAvailable = await this.availability.isWithinAvailability(
      service.providerId,
      scheduledAt,
      durationMinutes,
    );
    if (!isAvailable) {
      throw new ConflictException('This time slot is outside the provider availability');
    }

    return this.prisma.client.$transaction(async (tx) => {
      // Verrou consultatif par prestataire : sérialise la vérification de
      // conflit + la création pour ce prestataire, sans bloquer les autres.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${service.providerId}))`;

      const dayStart = new Date(scheduledAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const sameDayBookings = await tx.booking.findMany({
        where: {
          providerId: service.providerId,
          status: { in: [...ACTIVE_BOOKING_STATUSES] },
          scheduledAt: { gte: dayStart, lt: dayEnd },
        },
      });

      if (hasSchedulingConflict(sameDayBookings, scheduledAt, durationMinutes)) {
        throw new ConflictException('This time slot has just been booked, please choose another one');
      }

      const basePrice = Number(service.basePrice);
      const optionsTotal = selectedOptions.reduce((sum, option) => sum + Number(option.priceDelta), 0);
      const subtotalAmount = basePrice + optionsTotal;
      const platformFeeAmount = Math.round(subtotalAmount * PLATFORM_FEE_RATE * 100) / 100;
      const providerAmount = subtotalAmount - platformFeeAmount;

      const booking = await tx.booking.create({
        data: {
          clientId,
          providerId: service.providerId,
          scheduledAt,
          durationMinutes,
          notes: dto.notes ?? null,
          items: {
            create: [
              { serviceId: service.id, quantity: 1, unitPrice: basePrice, subtotal: basePrice },
              ...selectedOptions.map((option) => ({
                serviceId: service.id,
                serviceOptionId: option.id,
                quantity: 1,
                unitPrice: Number(option.priceDelta),
                subtotal: Number(option.priceDelta),
              })),
            ],
          },
        },
        include: { items: true },
      });

      const order = await tx.order.create({
        data: {
          bookingId: booking.id,
          clientId,
          subtotalAmount,
          platformFeeAmount,
          providerAmount,
          totalAmount: subtotalAmount,
          currency: service.currency,
          items: {
            create: booking.items.map((item) => ({
              bookingItemId: item.id,
              description: item.serviceOptionId
                ? (selectedOptions.find((o) => o.id === item.serviceOptionId)?.name ?? service.title)
                : service.title,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
      });

      return { booking, order };
    });
  }

  async listMine(clientId: string) {
    return this.prisma.client.booking.findMany({
      where: { clientId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        items: { include: { service: true, serviceOption: true } },
        order: { include: { payments: { select: { status: true } } } },
        provider: true,
      },
    });
  }

  async listForProvider(userId: string) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('No provider profile for this account');

    return this.prisma.client.booking.findMany({
      where: { providerId: provider.id },
      orderBy: { scheduledAt: 'desc' },
      include: {
        items: { include: { service: true, serviceOption: true } },
        order: true,
        client: { include: { profile: true } },
      },
    });
  }

  async getById(userId: string, role: string, bookingId: string) {
    const booking = await this.prisma.client.booking.findUnique({
      where: { id: bookingId },
      include: {
        items: { include: { service: true, serviceOption: true } },
        order: true,
        client: { include: { profile: true } },
        provider: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    await this.assertParticipant(userId, role, booking);
    return booking;
  }

  async confirm(userId: string, bookingId: string) {
    const booking = await this.getOwnedByProvider(userId, bookingId);
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    return this.prisma.client.$transaction([
      this.prisma.client.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED' } }),
      this.prisma.client.order.update({
        where: { bookingId },
        data: { status: 'CONFIRMED' },
      }),
    ]);
  }

  async reject(userId: string, bookingId: string, dto: CancelBookingDto) {
    const booking = await this.getOwnedByProvider(userId, bookingId);
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be rejected');
    }

    return this.prisma.client.$transaction([
      this.prisma.client.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: dto.reason ?? null },
      }),
      this.prisma.client.order.update({ where: { bookingId }, data: { status: 'CANCELLED' } }),
    ]);
  }

  async complete(userId: string, bookingId: string) {
    const booking = await this.getOwnedByProvider(userId, bookingId);
    if (booking.status !== 'CONFIRMED' && booking.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Only confirmed or in-progress bookings can be completed');
    }

    const result = await this.prisma.client.$transaction([
      this.prisma.client.booking.update({ where: { id: bookingId }, data: { status: 'COMPLETED' } }),
      this.prisma.client.order.update({ where: { bookingId }, data: { status: 'COMPLETED' } }),
    ]);

    // Libere le solde du prestataire (en attente -> disponible) si la commande a ete payee.
    // Volontairement hors transaction : ne doit jamais faire echouer la finalisation de la prestation.
    await this.payments.releaseHoldForBooking(bookingId);

    return result;
  }

  async cancel(clientId: string, bookingId: string, dto: CancelBookingDto) {
    const booking = await this.prisma.client.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.clientId !== clientId) {
      throw new ForbiddenException('This booking does not belong to your account');
    }
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException('This booking can no longer be cancelled');
    }
    if (booking.scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot cancel a booking that has already started');
    }

    return this.prisma.client.$transaction([
      this.prisma.client.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: dto.reason ?? null },
      }),
      this.prisma.client.order.update({ where: { bookingId }, data: { status: 'CANCELLED' } }),
    ]);
  }

  private async getOwnedByProvider(userId: string, bookingId: string) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('No provider profile for this account');

    const booking = await this.prisma.client.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.providerId !== provider.id) {
      throw new ForbiddenException('This booking does not belong to your account');
    }

    return booking;
  }

  private async assertParticipant(
    userId: string,
    role: string,
    booking: { clientId: string; providerId: string },
  ): Promise<void> {
    if (role === 'ADMIN') return;
    if (role === 'CLIENT' && booking.clientId === userId) return;

    if (role === 'PROVIDER') {
      const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
      if (provider && provider.id === booking.providerId) return;
    }

    throw new ForbiddenException('You do not have access to this booking');
  }
}
