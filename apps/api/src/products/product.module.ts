import { Module } from "@nestjs/common";
import { ProductController } from "./product.controller";
import { ProductReviewController } from "./product-review.controller";
import { ProductService } from "./product.service";
@Module({controllers:[ProductController,ProductReviewController],providers:[ProductService]})
export class ProductModule{}
