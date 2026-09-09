import { IsOptional, IsString } from 'class-validator';

export class CreateRefundDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
