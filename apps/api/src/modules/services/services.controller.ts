import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SearchServicesDto } from './dto/search-services.dto';
import { ServicesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get()
  search(@Query() dto: SearchServicesDto) {
    return this.servicesService.search(dto);
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
