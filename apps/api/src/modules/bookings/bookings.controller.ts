import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BookingsService } from './bookings.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Roles('CLIENT')
  @Post()
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(user.sub, dto);
  }

  @Roles('CLIENT')
  @Get('me')
  listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.bookingsService.listMine(user.sub);
  }

  @Roles('PROVIDER')
  @Get('provider/me')
  listForProvider(@CurrentUser() user: AccessTokenPayload) {
    return this.bookingsService.listForProvider(user.sub);
  }

  @Get(':id')
  getById(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.bookingsService.getById(user.sub, user.role, id);
  }

  @Roles('PROVIDER')
  @Patch(':id/confirm')
  confirm(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.bookingsService.confirm(user.sub, id);
  }

  @Roles('PROVIDER')
  @Patch(':id/reject')
  reject(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookingsService.reject(user.sub, id, dto);
  }

  @Roles('PROVIDER')
  @Patch(':id/complete')
  complete(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.bookingsService.complete(user.sub, id);
  }

  @Roles('CLIENT')
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancel(user.sub, id, dto);
  }
}
