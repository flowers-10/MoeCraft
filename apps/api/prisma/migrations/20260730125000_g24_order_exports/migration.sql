CREATE TABLE `OrderExportTask` (
  `id` VARCHAR(191) NOT NULL,
  `requesterId` VARCHAR(191) NOT NULL,
  `merchantId` VARCHAR(191) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `filters` JSON NOT NULL,
  `downloadName` VARCHAR(255) NULL,
  `resultCsv` LONGTEXT NULL,
  `errorMessage` VARCHAR(1000) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `OrderExportTask_requesterId_createdAt_idx` (`requesterId`,`createdAt`),
  INDEX `OrderExportTask_merchantId_status_idx` (`merchantId`,`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
