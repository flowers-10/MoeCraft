-- AlterTable
ALTER TABLE `Product` ADD COLUMN `saleType` ENUM('IN_STOCK', 'PREORDER') NOT NULL DEFAULT 'IN_STOCK',
    ADD COLUMN `presaleNotice` TEXT NULL,
    ADD COLUMN `shippingWindowStart` DATETIME(3) NULL,
    ADD COLUMN `shippingWindowEnd` DATETIME(3) NULL,
    ADD COLUMN `afterSalesSummary` VARCHAR(1000) NULL,
    ADD COLUMN `salesCount` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `Product_status_saleType_updatedAt_idx` ON `Product`(`status`, `saleType`, `updatedAt`);
