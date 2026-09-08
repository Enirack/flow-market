import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @MinLength(2)
  businessName!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase, alphanumeric, and hyphen-separated',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
