import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

export class AdminListServicesDto extends PaginationDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
