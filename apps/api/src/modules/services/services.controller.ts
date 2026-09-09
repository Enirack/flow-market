import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AddServiceImageDto } from './dto/add-service-image.dto';
import { CreateServiceOptionDto } from './dto/create-service-option.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { SearchServicesDto } from './dto/search-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get()
  search(@Query() dto: SearchServicesDto) {
    return this.servicesService.search(dto);
  }

  // Les routes "me" (provider) sont declarees avant ":slug" (public) pour eviter
  // que Nest ne resolve "me" comme un slug de service.
  @Roles('PROVIDER')
  @Get('me')
  listMine(@CurrentUser() user: AccessTokenPayload) {
    return this.servicesService.listMine(user.sub);
  }

  @Roles('PROVIDER')
  @Post()
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(user.sub, dto);
  }

  @Roles('PROVIDER')
  @Patch(':id')
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(user.sub, id, dto);
  }

  @Roles('PROVIDER')
  @Patch(':id/publish')
  publish(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.servicesService.publish(user.sub, id);
  }

  @Roles('PROVIDER')
  @Patch(':id/archive')
  archive(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string) {
    return this.servicesService.archive(user.sub, id);
  }

  @Roles('PROVIDER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@CurrentUser() user: AccessTokenPayload, @Param('id') id: string): Promise<void> {
    await this.servicesService.remove(user.sub, id);
  }

  @Roles('PROVIDER')
  @Post(':id/images')
  addImage(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: AddServiceImageDto,
  ) {
    return this.servicesService.addImage(user.sub, id, dto);
  }

  @Roles('PROVIDER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/images/:imageId')
  async removeImage(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<void> {
    await this.servicesService.removeImage(user.sub, id, imageId);
  }

  @Roles('PROVIDER')
  @Post(':id/options')
  addOption(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Body() dto: CreateServiceOptionDto,
  ) {
    return this.servicesService.addOption(user.sub, id, dto);
  }

  @Roles('PROVIDER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/options/:optionId')
  async removeOption(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id') id: string,
    @Param('optionId') optionId: string,
  ): Promise<void> {
    await this.servicesService.removeOption(user.sub, id, optionId);
  }

  @Public()
  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.servicesService.getBySlug(slug);
  }

  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @Post('admin/reindex')
  async reindex() {
    const count = await this.servicesService.reindexAll();
    return { indexed: count };
  }
}
