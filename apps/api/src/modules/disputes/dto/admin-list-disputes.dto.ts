import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'] as const;

export class AdminListDisputesDto extends PaginationDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
