import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { CreateFileDto } from "./files.dto";
import { FilesService, type UploadedFilePayload } from "./files.service";

@Controller("files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @RequireRoles("CUSTOMER", "MERCHANT_OWNER", "MERCHANT_STAFF", "PLATFORM_OPERATOR", "PLATFORM_ADMIN")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 20_000_000, files: 1 } }))
  create(@Req() request: { user: RequestPrincipal }, @Body() dto: CreateFileDto, @UploadedFile() file?: UploadedFilePayload) {
    return this.files.create(request.user.sub, dto, file);
  }

  @Get(":id")
  download(@Param("id") id: string) {
    return this.files.download(id);
  }
}
