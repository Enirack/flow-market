import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const VERIFICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export class AdminListProvidersDto extends PaginationDto {
  @IsOptional()
  @IsIn(VERIFICATION_STATUSES)
  verificationStatus?: (typeof VERIFICATION_STATUSES)[number];
}
