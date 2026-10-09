import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service';
import type { MailService } from './mail.service';
import { NotificationsService } from './notifications.service';

function createPrismaMock() {
  return {
    notification: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'client@flowmarket.dev',
        profile: { firstName: 'Aïcha' },
      }),
    },
  };
}

describe('NotificationsService.notify', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let mailMock: { sendMail: ReturnType<typeof vi.fn> };
  let service: NotificationsService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    mailMock = { sendMail: vi.fn().mockResolvedValue(undefined) };
    service = new NotificationsService(
      { client: prismaMock } as unknown as PrismaService,
      mailMock as unknown as MailService,
    );
  });

  it('persists a Notification row and sends the matching email', async () => {
    await service.notify('user-1', 'BOOKING_CONFIRMED', {
      serviceTitle: 'Création de logo',
      scheduledAt: new Date().toISOString(),
      counterpartName: 'Karim Studio',
    });

    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1', type: 'BOOKING_CONFIRMED' }) }),
    );
    expect(mailMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'client@flowmarket.dev', subject: expect.stringContaining('Création de logo') }),
    );
  });

  it('does not throw when persisting the notification fails', async () => {
    prismaMock.notification.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.notify('user-1', 'NEW_REVIEW', {
        serviceTitle: 'Création de logo',
        rating: 5,
        comment: null,
        clientName: 'Aïcha Diallo',
      }),
    ).resolves.toBeUndefined();
    expect(mailMock.sendMail).not.toHaveBeenCalled();
  });

  it('does not throw when sending the email fails', async () => {
    mailMock.sendMail.mockRejectedValue(new Error('smtp down'));

    await expect(
      service.notify('user-1', 'NEW_REVIEW', {
        serviceTitle: 'Création de logo',
        rating: 5,
        comment: null,
        clientName: 'Aïcha Diallo',
      }),
    ).resolves.toBeUndefined();
  });
});
