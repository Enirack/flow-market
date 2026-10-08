import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminListProvidersDto } from './dto/admin-list-providers.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Roles('CLIENT')
  @Post()
  onboard(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateProviderDto) {
    return this.providersService.onboard(user.sub, dto);
  }

  @Roles('PROVIDER')
  @Get('me')
  getMe(@CurrentUser() user: AccessTokenPayload) {
    return this.providersService.getMe(user.sub);
  }

  @Roles('PROVIDER')
  @Patch('me')
  updateMe(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateProviderDto) {
    return this.providersService.updateMe(user.sub, dto);
  }

  @Roles('PROVIDER')
  @Get('me/stats')
  getMyStats(@CurrentUser() user: AccessTokenPayload) {
    return this.providersService.getMyStats(user.sub);
  }

  @Roles('PROVIDER')
  @Get('me/recent-bookings')
  getRecentBookings(@CurrentUser() user: AccessTokenPayload) {
    return this.providersService.getRecentBookings(user.sub);
  }

  @Roles('ADMIN')
  @Get('admin')
  adminList(@Query() dto: AdminListProvidersDto) {
    return this.providersService.adminList(dto);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.providersService.getBySlug(slug);
  }

  @Roles('ADMIN')
  @Patch(':id/verification')
  reviewVerification(
    @Param('id') providerId: string,
    @Body() dto: ReviewVerificationDto,
    @CurrentUser() admin: AccessTokenPayload,
  ) {
    return this.providersService.reviewVerification(providerId, dto, admin.sub);
  }
}
