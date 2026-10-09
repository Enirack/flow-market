import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { NotificationType, Prisma } from '@flowmarket/database';
import { PrismaService } from '../database/prisma.service';
import { MailService } from './mail.service';
import { buildNotificationEmail, emailVerificationTemplate, passwordResetTemplate } from './templates';
import type { NotificationPayloads } from './templates';
import type { PaginationDto } from '../common/dto/pagination.dto';

/**
 * Point d'entree unique pour notifier un utilisateur : persiste une ligne
 * `Notification` (consultable via la cloche cote client/prestataire) et
 * envoie l'email correspondant. Best-effort - une erreur ici ne doit jamais
 * faire echouer le flux metier qui l'a declenchee (reservation, paiement,
 * litige...), d'ou le catch interne systematique.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async notify<T extends keyof NotificationPayloads>(
    userId: string,
    type: T,
    payload: NotificationPayloads[T],
  ): Promise<void> {
    try {
      await this.prisma.client.notification.create({
        data: { userId, type: type as NotificationType, payload: payload as Prisma.InputJsonValue },
      });

      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (!user) return;

      const email = buildNotificationEmail(user.profile?.firstName ?? 'là', type, payload);
      await this.mail.sendMail({ to: user.email, ...email });
    } catch (error) {
      this.logger.error(`Échec de notification (${type}) pour ${userId}: ${(error as Error).message}`);
    }
  }

  async sendAuthEmail(email: string, firstName: string, kind: 'verify' | 'reset', token: string): Promise<void> {
    const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';
    const content =
      kind === 'verify'
        ? emailVerificationTemplate(firstName, `${webUrl}/verify-email?token=${token}`)
        : passwordResetTemplate(firstName, `${webUrl}/reset-password?token=${token}`);

    await this.mail.sendMail({ to: email, ...content });
  }

  async listMine(userId: string, pagination: PaginationDto) {
    const where = { userId };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.client.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.client.notification.count({ where }),
      this.prisma.client.notification.count({ where: { ...where, readAt: null } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page: pagination.page,
      totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.client.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.client.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.client.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
