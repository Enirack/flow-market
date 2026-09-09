import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@flowmarket/database';
import {
  MockPaymentProvider,
  type PaymentProviderName,
  type PaymentProviderRegistry,
  type WebhookEvent,
} from '@flowmarket/payments';
import { PrismaService } from '../../database/prisma.service';
import { PAYMENT_PROVIDER_REGISTRY } from './payment-provider-registry.provider';
import type { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import type { CreateRefundDto } from './dto/create-refund.dto';

const PAYABLE_ORDER_STATUSES = new Set(['CONFIRMED', 'IN_PROGRESS']);
const ACTIVE_PAYMENT_STATUSES = new Set(['PENDING', 'PROCESSING']);

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_REGISTRY) private readonly registry: PaymentProviderRegistry,
  ) {}

  private get allowMock(): boolean {
    return (process.env.PAYMENT_PROVIDER_MODE ?? 'mock') !== 'live';
  }

  async createIntent(clientId: string, orderId: string, dto: CreatePaymentIntentDto) {
    const order = await this.prisma.client.order.findUnique({
      where: { id: orderId },
      include: { payments: true, booking: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.clientId !== clientId) {
      throw new ForbiddenException('This order does not belong to your account');
    }
    if (!PAYABLE_ORDER_STATUSES.has(order.status)) {
      throw new BadRequestException('Payment can only be initiated once the provider has confirmed the booking');
    }
    if (order.payments.some((payment) => payment.status === 'SUCCEEDED')) {
      throw new BadRequestException('This order has already been paid');
    }

    const adapter = this.registry.resolveForCurrency(order.currency, {
      ...(dto.provider ? { preferred: dto.provider } : {}),
      allowMock: this.allowMock,
    });

    const activePayment = order.payments.find(
      (payment) => ACTIVE_PAYMENT_STATUSES.has(payment.status) && payment.provider === adapter.name,
    );
    if (activePayment) {
      return { payment: activePayment, clientPayload: activePayment.clientPayload };
    }

    const client = await this.prisma.client.user.findUniqueOrThrow({ where: { id: clientId } });
    const attemptNumber = order.payments.length + 1;
    const idempotencyKey = `order:${order.id}:attempt:${attemptNumber}`;
    const providerSlug = adapter.name.toLowerCase();

    const intent = await adapter.createPaymentIntent({
      idempotencyKey,
      orderId: order.id,
      amount: Number(order.totalAmount),
      currency: order.currency,
      description: `FlowMarket - commande ${order.id}`,
      customerEmail: client.email,
      metadata: {
        orderId: order.id,
        redirectUrl: `${webUrl()}/dashboard/bookings`,
        returnUrl: `${webUrl()}/dashboard/bookings`,
        cancelUrl: `${webUrl()}/dashboard/bookings`,
        notifyUrl: `${apiUrl()}/api/v1/payments/webhooks/${providerSlug}`,
        callbackUrl: `${apiUrl()}/api/v1/payments/webhooks/${providerSlug}`,
      },
    });

    const payment = await this.prisma.client.payment.create({
      data: {
        orderId: order.id,
        provider: adapter.name,
        providerPaymentId: intent.providerPaymentId,
        amount: order.totalAmount,
        currency: order.currency,
        status: intent.status === 'SUCCEEDED' ? 'SUCCEEDED' : 'PENDING',
        idempotencyKey,
        clientPayload: intent.clientPayload as Prisma.InputJsonValue,
        transactions: {
          create: {
            type: 'INTENT_CREATED',
            amount: order.totalAmount,
            rawPayload: intent.clientPayload as Prisma.InputJsonValue,
          },
        },
      },
    });

    if (payment.status === 'SUCCEEDED') {
      await this.creditProviderBalanceOnSuccess(order.id);
    }

    return { payment, clientPayload: intent.clientPayload };
  }

  async getForOrder(userId: string, role: string, orderId: string) {
    const order = await this.prisma.client.order.findUnique({
      where: { id: orderId },
      include: { booking: true, payments: { include: { refunds: true }, orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertParticipant(userId, role, order);
    return order.payments;
  }

  async handleWebhook(
    providerName: PaymentProviderName,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
    parsedBody: unknown,
  ): Promise<{ processed: boolean; deduplicated?: boolean }> {
    if (providerName === 'MOCK' && !this.allowMock) {
      throw new ForbiddenException('The MOCK payment provider is disabled when PAYMENT_PROVIDER_MODE=live');
    }
    const adapter = this.registry.get(providerName);
    const event = await adapter.verifyAndParseWebhook({ rawBody, headers, parsedBody });

    const payment = await this.prisma.client.payment.findFirst({
      where: { provider: providerName, providerPaymentId: event.providerPaymentId },
    });
    if (!payment) {
      throw new NotFoundException(`No payment found for ${providerName}:${event.providerPaymentId}`);
    }

    const alreadyProcessed = await this.prisma.client.paymentTransaction.findFirst({
      where: { paymentId: payment.id, providerEventId: event.providerEventId },
    });
    if (alreadyProcessed) {
      return { processed: true, deduplicated: true };
    }

    if (event.type === 'payment.succeeded') {
      if (payment.status !== 'SUCCEEDED') {
        await this.prisma.client.$transaction([
          this.prisma.client.payment.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED' } }),
          this.prisma.client.paymentTransaction.create({
            data: recordTransactionData(payment.id, 'CAPTURED', event),
          }),
        ]);
        await this.creditProviderBalanceOnSuccess(payment.orderId);
      }
    } else if (event.type === 'payment.failed') {
      if (payment.status !== 'SUCCEEDED') {
        await this.prisma.client.$transaction([
          this.prisma.client.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } }),
          this.prisma.client.paymentTransaction.create({
            data: recordTransactionData(payment.id, 'FAILED', event),
          }),
        ]);
      }
    } else if (event.type === 'refund.succeeded') {
      await this.finalizeRefundFromWebhook(payment.id, event);
    }

    return { processed: true };
  }

  async createRefund(adminUserId: string, paymentId: string, dto: CreateRefundDto) {
    const payment = await this.prisma.client.payment.findUnique({
      where: { id: paymentId },
      include: { refunds: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'SUCCEEDED') {
      throw new BadRequestException('Only a succeeded payment can be refunded');
    }
    if (payment.refunds.some((refund) => refund.status !== 'FAILED')) {
      throw new BadRequestException('This payment has already been refunded or a refund is in progress');
    }

    const adapter = this.registry.get(payment.provider);
    const result = await adapter.createRefund({
      idempotencyKey: `refund:${payment.id}`,
      providerPaymentId: payment.providerPaymentId ?? '',
      amount: Number(payment.amount),
      currency: payment.currency,
      ...(dto.reason ? { reason: dto.reason } : {}),
    });

    const status = result.status === 'SUCCEEDED' ? 'SUCCEEDED' : result.status === 'FAILED' ? 'FAILED' : 'PROCESSING';
    const refund = await this.prisma.client.refund.create({
      data: {
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        reason: dto.reason ?? null,
        status,
        providerRefundId: result.providerRefundId,
        requestedByUserId: adminUserId,
        processedAt: status === 'SUCCEEDED' ? new Date() : null,
      },
    });

    if (status === 'SUCCEEDED') {
      await this.applyRefundEffects(payment.orderId, payment.id);
    }

    return refund;
  }

  /** Deplace le solde d'une commande de "en attente" vers "disponible" une fois la prestation terminee. */
  async releaseHoldForBooking(bookingId: string): Promise<void> {
    const order = await this.prisma.client.order.findUnique({
      where: { bookingId },
      include: { booking: true, payments: true },
    });
    if (!order) return;
    if (!order.payments.some((payment) => payment.status === 'SUCCEEDED')) return;

    await this.prisma.client.providerBalance.update({
      where: { providerId: order.booking.providerId },
      data: {
        pendingAmount: { decrement: order.providerAmount },
        availableAmount: { increment: order.providerAmount },
      },
    });
  }

  async simulateMockEvent(providerPaymentId: string, outcome: 'succeeded' | 'failed') {
    if (!this.allowMock) {
      throw new ForbiddenException('Mock payment simulation is disabled when PAYMENT_PROVIDER_MODE=live');
    }
    const payment = await this.prisma.client.payment.findFirst({
      where: { provider: 'MOCK', providerPaymentId },
    });
    if (!payment) throw new NotFoundException('Mock payment not found');

    const mockAdapter = this.registry.get('MOCK') as MockPaymentProvider;
    const simulated = mockAdapter.buildSimulatedEvent(providerPaymentId, outcome, Number(payment.amount), payment.currency);
    return this.handleWebhook('MOCK', Buffer.from(JSON.stringify(simulated)), {}, simulated);
  }

  private async creditProviderBalanceOnSuccess(orderId: string): Promise<void> {
    const order = await this.prisma.client.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { booking: true },
    });

    await this.prisma.client.providerBalance.upsert({
      where: { providerId: order.booking.providerId },
      create: { providerId: order.booking.providerId, pendingAmount: order.providerAmount, currency: order.currency },
      update: { pendingAmount: { increment: order.providerAmount } },
    });
  }

  private async finalizeRefundFromWebhook(paymentId: string, event: WebhookEvent): Promise<void> {
    const payment = await this.prisma.client.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { refunds: true },
    });
    const pendingRefund = payment.refunds.find(
      (refund) => refund.status === 'PENDING' || refund.status === 'PROCESSING',
    );
    if (!pendingRefund) return;

    await this.prisma.client.$transaction([
      this.prisma.client.refund.update({
        where: { id: pendingRefund.id },
        data: { status: 'SUCCEEDED', processedAt: new Date() },
      }),
      this.prisma.client.paymentTransaction.create({ data: recordTransactionData(payment.id, 'REFUNDED', event) }),
    ]);
    await this.applyRefundEffects(payment.orderId, payment.id);
  }

  private async applyRefundEffects(orderId: string, paymentId: string): Promise<void> {
    const order = await this.prisma.client.order.findUniqueOrThrow({ where: { id: orderId }, include: { booking: true } });
    const wasReleased = order.status === 'COMPLETED';

    await this.prisma.client.$transaction([
      this.prisma.client.payment.update({ where: { id: paymentId }, data: { status: 'REFUNDED' } }),
      this.prisma.client.order.update({ where: { id: orderId }, data: { status: 'REFUNDED' } }),
      this.prisma.client.providerBalance.update({
        where: { providerId: order.booking.providerId },
        data: wasReleased
          ? { availableAmount: { decrement: order.providerAmount } }
          : { pendingAmount: { decrement: order.providerAmount } },
      }),
    ]);
  }

  private async assertParticipant(
    userId: string,
    role: string,
    order: { clientId: string; booking: { providerId: string } },
  ): Promise<void> {
    if (role === 'ADMIN') return;
    if (role === 'CLIENT' && order.clientId === userId) return;

    if (role === 'PROVIDER') {
      const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
      if (provider && provider.id === order.booking.providerId) return;
    }

    throw new ForbiddenException('You do not have access to this order');
  }
}

function recordTransactionData(paymentId: string, type: 'CAPTURED' | 'FAILED' | 'REFUNDED', event: WebhookEvent) {
  return {
    paymentId,
    type,
    providerEventId: event.providerEventId,
    amount: event.amount,
    rawPayload: event.raw as Prisma.InputJsonValue,
  };
}

function apiUrl(): string {
  return process.env.API_PUBLIC_URL ?? 'http://localhost:4000';
}

function webUrl(): string {
  return process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';
}
