import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const ROLES = ['CLIENT', 'PROVIDER', 'ADMIN'] as const;
const STATUSES = ['ACTIVE', 'SUSPENDED', 'DELETED'] as const;

export class AdminListUsersDto extends PaginationDto {
  @IsOptional()
  @IsIn(ROLES)
  role?: (typeof ROLES)[number];

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
