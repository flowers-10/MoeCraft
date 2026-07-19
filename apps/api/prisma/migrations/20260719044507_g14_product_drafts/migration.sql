-- AlterTable
ALTER TABLE `product` ADD COLUMN `copyrightNotice` VARCHAR(500) NULL,
    ADD COLUMN `descriptionEnUs` TEXT NULL,
    ADD COLUMN `descriptionZhCn` TEXT NULL,
    ADD COLUMN `manufacturer` VARCHAR(160) NULL,
    ADD COLUMN `material` VARCHAR(160) NULL,
    ADD COLUMN `scale` VARCHAR(80) NULL,
    MODIFY `categoryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sku` ADD COLUMN `barcode` VARCHAR(80) NULL,
    ADD COLUMN `heightMm` INTEGER NULL,
    ADD COLUMN `lengthMm` INTEGER NULL,
    ADD COLUMN `optionValues` JSON NULL,
    ADD COLUMN `weightGrams` INTEGER NULL,
    ADD COLUMN `widthMm` INTEGER NULL;

-- CreateTable
CREATE TABLE `ProductMedia` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(20) NOT NULL DEFAULT 'IMAGE',
    `altZhCn` VARCHAR(200) NULL,
    `altEnUs` VARCHAR(200) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isCover` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductMedia_productId_sortOrder_idx`(`productId`, `sortOrder`),
    UNIQUE INDEX `ProductMedia_productId_fileId_key`(`productId`, `fileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Sku_barcode_idx` ON `Sku`(`barcode`);

-- AddForeignKey
ALTER TABLE `ProductMedia` ADD CONSTRAINT `ProductMedia_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
