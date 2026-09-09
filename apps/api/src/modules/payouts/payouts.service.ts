import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, PayoutStatus } from '@flowmarket/database';
import { UnsupportedProviderOperationError, type PaymentProviderRegistry } from '@flowmarket/payments';
import { PAYMENT_PROVIDER_REGISTRY } from '../payments/payment-provider-registry.provider';
import { PrismaService } from '../../database/prisma.service';
import type { ApprovePayoutDto } from './dto/approve-payout.dto';
import type { RejectPayoutDto } from './dto/reject-payout.dto';
import type { RequestPayoutDto } from './dto/request-payout.dto';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_REGISTRY) private readonly registry: PaymentProviderRegistry,
  ) {}

  private get allowMock(): boolean {
    return (process.env.PAYMENT_PROVIDER_MODE ?? 'mock') !== 'live';
  }

  async getMyBalance(userId: string) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId }, include: { balance: true } });
    if (!provider) throw new NotFoundException('No provider profile for this account');

    return (
      provider.balance ?? { providerId: provider.id, availableAmount: 0, pendingAmount: 0, currency: 'XOF' }
    );
  }

  async request(userId: string, dto: RequestPayoutDto) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId }, include: { balance: true } });
    if (!provider) throw new NotFoundException('No provider profile for this account');

    const available = Number(provider.balance?.availableAmount ?? 0);
    if (dto.amount > available) {
      throw new BadRequestException(`Requested amount exceeds available balance (${available} ${provider.balance?.currency ?? 'XOF'})`);
    }

    return this.prisma.client.$transaction(async (tx) => {
      // Reserve les fonds immediatement pour empecher deux demandes concurrentes de depasser le solde disponible.
      await tx.providerBalance.update({
        where: { providerId: provider.id },
        data: { availableAmount: { decrement: dto.amount } },
      });

      return tx.payout.create({
        data: {
          providerId: provider.id,
          amount: dto.amount,
          currency: provider.balance?.currency ?? 'XOF',
          method: dto.method,
          destinationDetails: dto.destinationDetails as Prisma.InputJsonValue,
        },
      });
    });
  }

  async listMine(userId: string) {
    const provider = await this.prisma.client.provider.findUnique({ where: { userId } });
    if (!provider) throw new NotFoundException('No provider profile for this account');

    return this.prisma.client.payout.findMany({
      where: { providerId: provider.id },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async listAll(status?: PayoutStatus) {
    return this.prisma.client.payout.findMany({
      ...(status ? { where: { status } } : {}),
      orderBy: { requestedAt: 'desc' },
      include: { provider: true },
    });
  }

  async approve(payoutId: string, dto: ApprovePayoutDto) {
    const payout = await this.prisma.client.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'REQUESTED') {
      throw new BadRequestException('Only a requested payout can be approved');
    }

    const adapter = this.registry.resolveForCurrency(payout.currency, {
      ...(dto.provider ? { preferred: dto.provider } : {}),
      allowMock: this.allowMock,
    });

    try {
      const result = await adapter.createPayout({
        idempotencyKey: `payout:${payout.id}`,
        amount: Number(payout.amount),
        currency: payout.currency,
        method: payout.method,
        destinationDetails: payout.destinationDetails as Record<string, unknown>,
      });

      return this.prisma.client.payout.update({
        where: { id: payoutId },
        data: {
          status: result.status,
          providerPayoutId: result.providerPayoutId,
          processedAt: result.status === 'PAID' ? new Date() : null,
        },
      });
    } catch (error) {
      await this.refundReservedFunds(payout.providerId, Number(payout.amount));
      const reason = error instanceof UnsupportedProviderOperationError ? error.message : 'Payout provider call failed';
      return this.prisma.client.payout.update({
        where: { id: payoutId },
        data: { status: 'FAILED', rejectionReason: reason, processedAt: new Date() },
      });
    }
  }

  async reject(payoutId: string, dto: RejectPayoutDto) {
    const payout = await this.prisma.client.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'REQUESTED') {
      throw new BadRequestException('Only a requested payout can be rejected');
    }

    await this.refundReservedFunds(payout.providerId, Number(payout.amount));

    return this.prisma.client.payout.update({
      where: { id: payoutId },
      data: { status: 'REJECTED', rejectionReason: dto.reason ?? null, processedAt: new Date() },
    });
  }

  private async refundReservedFunds(providerId: string, amount: number): Promise<void> {
    await this.prisma.client.providerBalance.update({
      where: { providerId },
      data: { availableAmount: { increment: amount } },
    });
  }
}
