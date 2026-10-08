import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminListDisputesDto } from './dto/admin-list-disputes.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesService } from './disputes.service';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(user.sub, dto);
  }

  @Roles('ADMIN')
  @Get()
  adminList(@Query() dto: AdminListDisputesDto) {
    return this.disputesService.adminList(dto);
  }

  @Roles('ADMIN')
  @Patch(':id/resolve')
  adminResolve(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @CurrentUser() admin: AccessTokenPayload,
  ) {
    return this.disputesService.adminResolve(id, dto, admin.sub);
  }
}
