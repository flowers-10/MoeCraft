import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import type { AppEnvironment } from "../config/environment";

@Module({
  imports: [JwtModule.registerAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService<AppEnvironment, true>) => ({
      secret: config.get("JWT_ACCESS_SECRET", { infer: true }),
      signOptions: { expiresIn: "15m" }
    })
  })],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}
