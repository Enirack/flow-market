import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { hasSchedulingConflict } from '../../common/utils/booking-conflict.util';
import { PrismaService } from '../../database/prisma.service';
import type { CreateAvailabilityDto } from './dto/create-availability.dto';

export const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] as const;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours! * 60 + minutes!;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('No provider profile for this account');

    return this.prisma.client.availability.findMany({
      where: { providerId: provider.id },
      orderBy: [{ weekday: 'asc' }, { specificDate: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateAvailabilityDto) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('No provider profile for this account');

    return this.prisma.client.availability.create({
      data: {
        providerId: provider.id,
        type: dto.type,
        weekday: dto.weekday ?? null,
        specificDate: dto.specificDate ? new Date(dto.specificDate) : null,
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        isBlocked: dto.isBlocked ?? false,
      },
    });
  }

  async remove(userId: string, availabilityId: string): Promise<void> {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('No provider profile for this account');

    const availability = await this.prisma.client.availability.findUnique({
      where: { id: availabilityId },
    });
    if (!availability || availability.providerId !== provider.id) {
      throw new ForbiddenException('This availability rule does not belong to your account');
    }

    await this.prisma.client.availability.delete({ where: { id: availabilityId } });
  }

  /** Fenêtres récurrentes du prestataire pour un jour de semaine donné, non bloquées ce jour-là. */
  private async getWindowsForDate(providerId: string, date: Date) {
    const weekday = date.getDay();

    const [recurring, exceptions] = await Promise.all([
      this.prisma.client.availability.findMany({
        where: { providerId, type: 'RECURRING', weekday },
      }),
      this.prisma.client.availability.findMany({
        where: {
          providerId,
          type: 'EXCEPTION',
          specificDate: { gte: startOfDay(date), lt: endOfDay(date) },
        },
      }),
    ]);

    if (exceptions.some((exception) => exception.isBlocked)) return [];
    return recurring;
  }

  async isWithinAvailability(providerId: string, scheduledAt: Date, durationMinutes: number): Promise<boolean> {
    const windows = await this.getWindowsForDate(providerId, scheduledAt);
    if (windows.length === 0) return false;

    const startMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
    const endMinutes = startMinutes + durationMinutes;

    return windows.some((window) => {
      if (!window.startTime || !window.endTime) return false;
      return startMinutes >= timeToMinutes(window.startTime) && endMinutes <= timeToMinutes(window.endTime);
    });
  }

  async computeAvailableSlots(serviceId: string, dateStr: string) {
    const service = await this.prisma.client.service.findUnique({ where: { id: serviceId } });
    if (!service || service.status !== 'PUBLISHED') {
      throw new NotFoundException('Service not found');
    }

    const date = new Date(`${dateStr}T00:00:00`);
    const durationMinutes = service.durationMinutes ?? 60;
    const windows = await this.getWindowsForDate(service.providerId, date);
    if (windows.length === 0) return [];

    const existingBookings = await this.prisma.client.booking.findMany({
      where: {
        providerId: service.providerId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        scheduledAt: { gte: startOfDay(date), lt: endOfDay(date) },
      },
    });

    const now = Date.now();
    const slotStepMinutes = 30;
    const slots: string[] = [];

    for (const window of windows) {
      if (!window.startTime || !window.endTime) continue;
      const windowStart = timeToMinutes(window.startTime);
      const windowEnd = timeToMinutes(window.endTime);

      for (let start = windowStart; start + durationMinutes <= windowEnd; start += slotStepMinutes) {
        const slotStart = new Date(date);
        slotStart.setHours(Math.floor(start / 60), start % 60, 0, 0);

        if (slotStart.getTime() <= now) continue;

        if (!hasSchedulingConflict(existingBookings, slotStart, durationMinutes)) {
          slots.push(slotStart.toISOString());
        }
      }
    }

    return slots;
  }
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + 1);
  return result;
}
