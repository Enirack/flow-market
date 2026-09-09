import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles('CLIENT')
  @Post('orders/:orderId/intent')
  createIntent(
    @CurrentUser() user: AccessTokenPayload,
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createIntent(user.sub, orderId, dto);
  }

  @Get('orders/:orderId')
  getForOrder(@CurrentUser() user: AccessTokenPayload, @Param('orderId') orderId: string) {
    return this.paymentsService.getForOrder(user.sub, user.role, orderId);
  }

  @Roles('ADMIN')
  @Post(':paymentId/refund')
  createRefund(
    @CurrentUser() user: AccessTokenPayload,
    @Param('paymentId') paymentId: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.paymentsService.createRefund(user.sub, paymentId, dto);
  }
}
