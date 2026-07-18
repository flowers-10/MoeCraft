import { IsString, Length, Matches, MinLength } from "class-validator";

export class RegisterDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]+$/) @Length(3, 80) username!: string;
  @IsString() @Length(1, 120) displayName!: string;
  @IsString() @MinLength(12) password!: string;
}

export class LoginDto {
  @IsString() @Length(3, 80) account!: string;
  @IsString() @MinLength(1) password!: string;
}

export class RefreshDto { @IsString() @MinLength(20) refreshToken!: string; }
export class LogoutDto { @IsString() @MinLength(20) refreshToken!: string; }
export class ForgotPasswordDto { @IsString() @Length(3, 80) account!: string; }

export class ResetPasswordDto {
  @IsString() @MinLength(20) token!: string;
  @IsString() @MinLength(12) password!: string;
}
