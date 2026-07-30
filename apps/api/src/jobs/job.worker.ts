import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { StructuredLogger } from "../observability/structured-logger";
import { JobService } from "./job.service";
@Injectable()
export class JobWorker implements OnApplicationBootstrap,OnApplicationShutdown{
  private timer?:ReturnType<typeof setInterval>;private running=false;
  constructor(private readonly jobs:JobService,private readonly logger:StructuredLogger){}
  onApplicationBootstrap(){void this.tick();this.timer=setInterval(()=>{void this.tick();},15_000);this.timer.unref();}
  onApplicationShutdown(){if(this.timer)clearInterval(this.timer);}
  private async tick(){if(this.running)return;this.running=true;try{const processed=await this.jobs.processDue();if(processed)this.logger.info("jobs.processed",{processed});}catch(error){this.logger.error("jobs.poll_failed",{error:error instanceof Error?error.message:"JOB_POLL_FAILED"});}finally{this.running=false;}}
}
