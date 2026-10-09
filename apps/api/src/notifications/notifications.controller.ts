import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  listMine(@CurrentUser() user: AccessTokenPayload, @Query() pagination: PaginationDto) {
    return this.notifications.listMine(user.sub, pagination);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AccessTokenPayload) {
    return this.notifications.markAllRead(user.sub);
  }
}
