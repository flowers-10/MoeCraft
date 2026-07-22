import { IsString, Length } from "class-validator";

export class CreateFileDto {
  @IsString()
  @Length(1, 80)
  purpose!: string;
}
