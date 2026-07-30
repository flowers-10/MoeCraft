import { Controller, Get, Param, Post } from "@nestjs/common";
import { RequireAdminButton, RequireAdminRoute, RequireRoles } from "../auth/authorization";
import { JobService } from "./job.service";
@Controller("admin/jobs")
@RequireRoles("PLATFORM_OPERATOR","PLATFORM_ADMIN")
@RequireAdminRoute("system.jobs")
export class JobController{
  constructor(private readonly jobs:JobService){}
  @Get("failed")list(){return this.jobs.listFailed();}
  @Post(":id/replay")@RequireRoles("PLATFORM_ADMIN")@RequireAdminButton("jobs.replay")replay(@Param("id")id:string){return this.jobs.replay(id);}
}
