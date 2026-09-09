import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import type { PayoutStatus } from '@flowmarket/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApprovePayoutDto } from './dto/approve-payout.dto';
import { RejectPayoutDto } from './dto/reject-payout.dto';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { PayoutsService } from './payouts.service';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Roles('PROVIDER')
  @Post()
  request(@CurrentUser() user: AccessTokenPayload, @Body() dto: RequestPayoutDto) {
    return this.payoutsService.request(user.sub, dto);
  }

  @Roles('PROVIDER')
  @Get('me')
  listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.payoutsService.listMine(user.sub);
  }

  @Roles('ADMIN')
  @Get()
  listAll(@Query('status') status?: PayoutStatus) {
    return this.payoutsService.listAll(status);
  }

  @Roles('ADMIN')
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApprovePayoutDto) {
    return this.payoutsService.approve(id, dto);
  }

  @Roles('ADMIN')
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectPayoutDto) {
    return this.payoutsService.reject(id, dto);
  }
}
