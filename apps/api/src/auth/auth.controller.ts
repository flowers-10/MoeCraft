import { Body, Controller, Get, Headers, Ip, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { ForgotPasswordDto, LoginDto, LogoutDto, RefreshDto, RegisterDto, ResetPasswordDto } from "./auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register") @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto, @Ip() ip: string, @Headers("user-agent") agent?: string) { return this.auth.register(dto, ip, agent); }

  @Post("login") @Throttle({ default: { limit: 8, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @Ip() ip: string, @Headers("user-agent") agent?: string) { return this.auth.login(dto, ip, agent); }

  @Post("refresh") @Throttle({ default: { limit: 20, ttl: 60_000 } })
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }

  @Post("logout") logout(@Body() dto: LogoutDto) { return this.auth.logout(dto.refreshToken); }
  @Get("me") me(@Headers("authorization") authorization?: string) { return this.auth.me(authorization); }
  @Get("access-profile") accessProfile(@Headers("authorization") authorization?: string) { return this.auth.accessProfile(authorization); }

  @Post("forgot-password") @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgot(@Body() dto: ForgotPasswordDto) { return this.auth.forgotPassword(dto.account); }

  @Post("reset-password") @Throttle({ default: { limit: 5, ttl: 60_000 } })
  reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto.token, dto.password); }
}
