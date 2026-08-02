import { Module } from "@nestjs/common";
import { AdminReviewController, ReviewController } from "./review.controller";
import { ReviewService } from "./review.service";
@Module({ controllers: [ReviewController, AdminReviewController], providers: [ReviewService] })
export class ReviewModule {}
