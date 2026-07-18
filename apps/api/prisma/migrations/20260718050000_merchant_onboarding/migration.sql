-- AlterTable
ALTER TABLE `Merchant` ADD COLUMN `ownerId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `MerchantApplication` (
  `id` VARCHAR(191) NOT NULL,
  `applicantId` VARCHAR(191) NOT NULL,
  `reviewerId` VARCHAR(191) NULL,
  `status` ENUM('DRAFT', 'SUBMITTED', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'DRAFT',
  `companyName` VARCHAR(160) NOT NULL,
  `contactName` VARCHAR(120) NOT NULL,
  `contactPhone` VARCHAR(40) NOT NULL,
  `contactEmail` VARCHAR(160) NOT NULL,
  `businessLicenseNumber` VARCHAR(100) NOT NULL,
  `qualificationFileIds` JSON NOT NULL,
  `agreementAccepted` BOOLEAN NOT NULL DEFAULT false,
  `reviewComment` VARCHAR(1000) NULL,
  `submittedAt` DATETIME(3) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `MerchantApplication_applicantId_createdAt_idx`(`applicantId`, `createdAt`),
  INDEX `MerchantApplication_status_submittedAt_idx`(`status`, `submittedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MerchantApplicationTimeline` (
  `id` VARCHAR(191) NOT NULL,
  `applicationId` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `fromStatus` ENUM('DRAFT', 'SUBMITTED', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED', 'WITHDRAWN') NULL,
  `toStatus` ENUM('DRAFT', 'SUBMITTED', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED', 'WITHDRAWN') NOT NULL,
  `comment` VARCHAR(1000) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `MerchantApplicationTimeline_applicationId_createdAt_idx`(`applicationId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `Merchant_ownerId_key` ON `Merchant`(`ownerId`);
ALTER TABLE `Merchant` ADD CONSTRAINT `Merchant_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MerchantApplication` ADD CONSTRAINT `MerchantApplication_applicantId_fkey` FOREIGN KEY (`applicantId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MerchantApplication` ADD CONSTRAINT `MerchantApplication_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MerchantApplicationTimeline` ADD CONSTRAINT `MerchantApplicationTimeline_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `MerchantApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MerchantApplicationTimeline` ADD CONSTRAINT `MerchantApplicationTimeline_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
