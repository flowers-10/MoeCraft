import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import type { AppEnvironment } from "../config/environment";
import { AuthorizationGuard } from "./authorization";

@Module({
  imports: [JwtModule.registerAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService<AppEnvironment, true>) => ({
      secret: config.get("JWT_ACCESS_SECRET", { infer: true }),
      signOptions: { expiresIn: config.get("JWT_ACCESS_EXPIRES_IN", { infer: true }) }
    })
  })],
  controllers: [AuthController],
  providers: [AuthService, AuthorizationGuard],
  exports: [AuthService, AuthorizationGuard, JwtModule]
})
export class AuthModule {}
