import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewVerificationDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
