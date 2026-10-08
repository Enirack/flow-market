import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Query } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminListUsersDto } from './dto/admin-list-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AccessTokenPayload) {
    return this.usersService.getMe(user.sub);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: AccessTokenPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  async deleteAccount(@CurrentUser() user: AccessTokenPayload): Promise<void> {
    await this.usersService.deleteAccount(user.sub);
  }

  @Roles('ADMIN')
  @Get('admin')
  adminList(@Query() dto: AdminListUsersDto) {
    return this.usersService.adminList(dto);
  }

  @Roles('ADMIN')
  @Patch('admin/:id/suspend')
  adminSuspend(@Param('id') id: string) {
    return this.usersService.adminSuspend(id);
  }

  @Roles('ADMIN')
  @Patch('admin/:id/reactivate')
  adminReactivate(@Param('id') id: string) {
    return this.usersService.adminReactivate(id);
  }
}
