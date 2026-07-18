import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length } from "class-validator";

export class SaveMerchantApplicationDto {
  @IsString() @Length(2, 160) companyName!: string;
  @IsString() @Length(2, 120) contactName!: string;
  @IsString() @Length(6, 40) contactPhone!: string;
  @IsEmail() @Length(5, 160) contactEmail!: string;
  @IsString() @Length(5, 100) businessLicenseNumber!: string;
  @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) qualificationFileIds!: string[];
  @IsBoolean() agreementAccepted!: boolean;
}

export class ReviewMerchantApplicationDto {
  @IsIn(["APPROVE", "REJECT", "REQUEST_CHANGES"])
  decision!: "APPROVE" | "REJECT" | "REQUEST_CHANGES";

  @IsOptional() @IsString() @Length(2, 1000)
  comment?: string;
}

export class SetMerchantStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";

  @IsString() @Length(2, 500)
  reason!: string;
}
