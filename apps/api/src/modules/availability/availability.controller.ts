import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Roles('PROVIDER')
  @Get('me')
  async listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.availabilityService.listMine(user.sub);
  }

  @Roles('PROVIDER')
  @Post()
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateAvailabilityDto) {
    return this.availabilityService.create(user.sub, dto);
  }

  @Roles('PROVIDER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string): Promise<void> {
    await this.availabilityService.remove(user.sub, id);
  }

  @Public()
  @Get('slots')
  getSlots(@Query('serviceId') serviceId: string, @Query('date') date: string) {
    return this.availabilityService.computeAvailableSlots(serviceId, date);
  }
}
