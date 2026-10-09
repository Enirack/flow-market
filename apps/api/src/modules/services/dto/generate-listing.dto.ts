import { IsString, MinLength } from 'class-validator';

export class GenerateListingDto {
  @IsString()
  @MinLength(10)
  raw!: string;
}
