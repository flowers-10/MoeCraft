ALTER TABLE `Sku` ADD COLUMN `imageFileId` VARCHAR(191) NULL;

CREATE TABLE `ProductDescriptionAsset` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `fileId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ProductDescriptionAsset_productId_fileId_key`(`productId`, `fileId`),
  INDEX `ProductDescriptionAsset_fileId_idx`(`fileId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProductDescriptionAsset`
  ADD CONSTRAINT `ProductDescriptionAsset_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
