import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AccessTokenPayload } from '@flowmarket/auth';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminListReviewsDto } from './dto/admin-list-reviews.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Roles('CLIENT')
  @Post()
  create(@CurrentUser() user: AccessTokenPayload, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.sub, dto);
  }

  @Roles('ADMIN')
  @Get('admin')
  adminList(@Query() dto: AdminListReviewsDto) {
    return this.reviewsService.adminList(dto);
  }

  @Roles('ADMIN')
  @Patch('admin/:id/hide')
  adminHide(@Param('id') id: string) {
    return this.reviewsService.adminHide(id);
  }
}
