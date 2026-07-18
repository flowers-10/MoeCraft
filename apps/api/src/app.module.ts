import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { validateEnvironment } from "./config/environment";
import { PrismaModule } from "./prisma/prisma.module";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment
    }),
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
