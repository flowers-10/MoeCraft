import { Body, Controller, Post, Req } from "@nestjs/common";
import { RequireRoles, type RequestPrincipal } from "../auth/authorization";
import { CreateFileDto } from "./files.dto";
import { FilesService } from "./files.service";

@Controller("files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post() @RequireRoles("CUSTOMER", "MERCHANT_OWNER", "MERCHANT_STAFF", "PLATFORM_OPERATOR", "PLATFORM_ADMIN")
  create(@Req() request: { user: RequestPrincipal }, @Body() dto: CreateFileDto) {
    return this.files.create(request.user.sub, dto);
  }
}
