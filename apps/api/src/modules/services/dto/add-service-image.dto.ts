import { IsUrl } from 'class-validator';

export class AddServiceImageDto {
  @IsUrl({}, { message: 'url must be a valid URL' })
  url!: string;
}
