import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { validateEnvironment } from "./config/environment";
import { PrismaModule } from "./prisma/prisma.module";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerGuard } from "@nestjs/throttler";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { AuthorizationGuard } from "./auth/authorization";
import { AuditModule } from "./audit/audit.module";
import { FilesModule } from "./files/files.module";
import { MerchantsModule } from "./merchants/merchants.module";
import { CatalogModule } from "./catalog/catalog.module";
import { ApiExceptionFilter } from "./http/api-exception.filter";
import { ApiResponseInterceptor } from "./http/api-response.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment
    }),
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule,
    AuditModule,
    FilesModule,
    MerchantsModule,
    CatalogModule
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }, { provide: APP_GUARD, useClass: AuthorizationGuard }, { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor }, { provide: APP_FILTER, useClass: ApiExceptionFilter }]
})
export class AppModule {}
