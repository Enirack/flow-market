import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: AccessTokenPayload) {
    return this.favoritesService.list(user.sub);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':serviceId')
  async add(
    @CurrentUser() user: AccessTokenPayload,
    @Param('serviceId') serviceId: string,
  ): Promise<void> {
    await this.favoritesService.add(user.sub, serviceId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':serviceId')
  async remove(
    @CurrentUser() user: AccessTokenPayload,
    @Param('serviceId') serviceId: string,
  ): Promise<void> {
    await this.favoritesService.remove(user.sub, serviceId);
  }
}
