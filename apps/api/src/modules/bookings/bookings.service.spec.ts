import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AvailabilityService } from '../availability/availability.service';
import type { PrismaService } from '../../database/prisma.service';
import { BookingsService } from './bookings.service';

const FUTURE_DATE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

function createTxMock(overrides: { sameDayBookings?: unknown[] } = {}) {
  return {
    $executeRaw: vi.fn(),
    booking: {
      findMany: vi.fn().mockResolvedValue(overrides.sameDayBookings ?? []),
      create: vi.fn().mockResolvedValue({
        id: 'booking-1',
        items: [{ id: 'item-1', serviceId: 'service-1', serviceOptionId: null, quantity: 1, unitPrice: 100, subtotal: 100 }],
      }),
      update: vi.fn(),
    },
    order: {
      create: vi.fn().mockResolvedValue({ id: 'order-1' }),
      update: vi.fn(),
    },
  };
}

describe('BookingsService.create', () => {
  let prismaMock: { client: Record<string, unknown> };
  let availabilityMock: { isWithinAvailability: ReturnType<typeof vi.fn> };
  let service: BookingsService;
  let txMock: ReturnType<typeof createTxMock>;

  beforeEach(() => {
    txMock = createTxMock();
    prismaMock = {
      client: {
        service: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'service-1',
            providerId: 'provider-1',
            status: 'PUBLISHED',
            durationMinutes: 60,
            basePrice: 100,
            currency: 'XOF',
            title: 'Test service',
            options: [],
          }),
        },
        $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(txMock)),
      },
    };
    availabilityMock = { isWithinAvailability: vi.fn().mockResolvedValue(true) };
    service = new BookingsService(
      prismaMock as unknown as PrismaService,
      availabilityMock as unknown as AvailabilityService,
    );
  });

  it('creates a booking and order when the slot is available and conflict-free', async () => {
    const result = await service.create('client-1', { serviceId: 'service-1', scheduledAt: FUTURE_DATE });

    expect(result.booking.id).toBe('booking-1');
    expect(result.order.id).toBe('order-1');
    expect(txMock.booking.create).toHaveBeenCalledOnce();
    expect(txMock.order.create).toHaveBeenCalledOnce();
  });

  it('rejects a booking in the past', async () => {
    await expect(
      service.create('client-1', { serviceId: 'service-1', scheduledAt: '2020-01-01T10:00:00.000Z' }),
    ).rejects.toThrow('scheduledAt must be a valid date in the future');
  });

  it('rejects when the slot is outside the provider availability', async () => {
    availabilityMock.isWithinAvailability.mockResolvedValue(false);

    await expect(
      service.create('client-1', { serviceId: 'service-1', scheduledAt: FUTURE_DATE }),
    ).rejects.toThrow('outside the provider availability');
  });

  it('rejects when another booking already occupies the requested slot', async () => {
    const scheduledAt = new Date(FUTURE_DATE);
    txMock = createTxMock({
      sameDayBookings: [{ scheduledAt, durationMinutes: 60 }],
    });
    (prismaMock.client as { $transaction: ReturnType<typeof vi.fn> }).$transaction = vi.fn((cb) => cb(txMock));

    await expect(
      service.create('client-1', { serviceId: 'service-1', scheduledAt: scheduledAt.toISOString() }),
    ).rejects.toThrow('just been booked');
  });

  it('rejects when a selected option does not belong to the service', async () => {
    await expect(
      service.create('client-1', {
        serviceId: 'service-1',
        scheduledAt: FUTURE_DATE,
        optionIds: ['00000000-0000-0000-0000-000000000000'],
      }),
    ).rejects.toThrow('do not belong to this service');
  });
});
