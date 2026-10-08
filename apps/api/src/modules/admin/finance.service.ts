import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [revenueAgg, commissionAgg, activeProviders, pendingPayouts, totalUsers, openDisputes] = await Promise.all([
      this.prisma.client.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amount: true } }),
      this.prisma.client.order.aggregate({
        where: { payments: { some: { status: 'SUCCEEDED' } } },
        _sum: { platformFeeAmount: true },
      }),
      this.prisma.client.provider.count({ where: { isActive: true } }),
      this.prisma.client.payout.count({ where: { status: 'REQUESTED' } }),
      this.prisma.client.user.count({ where: { deletedAt: null } }),
      this.prisma.client.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    ]);

    return {
      totalRevenue: revenueAgg._sum.amount ?? 0,
      totalCommission: commissionAgg._sum.platformFeeAmount ?? 0,
      activeProviders,
      pendingPayouts,
      totalUsers,
      openDisputes,
    };
  }
}
