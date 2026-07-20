import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { LocalObjectStorageService } from "./local-object-storage.service";
import { FilesService } from "./files.service";

@Module({
  controllers: [FilesController],
  providers: [FilesService, LocalObjectStorageService],
  exports: [FilesService]
})
export class FilesModule {}
