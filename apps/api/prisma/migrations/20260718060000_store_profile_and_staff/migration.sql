ALTER TABLE `Store`
  ADD COLUMN `logoFileId` VARCHAR(191) NULL,
  ADD COLUMN `bannerFileId` VARCHAR(191) NULL,
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `customerServiceEmail` VARCHAR(160) NULL,
  ADD COLUMN `customerServicePhone` VARCHAR(40) NULL,
  ADD COLUMN `returnAddress` JSON NULL;

CREATE TABLE `MerchantMember` (
  `id` VARCHAR(191) NOT NULL,
  `merchantId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `role` ENUM('OWNER','STAFF') NOT NULL DEFAULT 'STAFF',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MerchantMember_merchantId_userId_key`(`merchantId`,`userId`),
  INDEX `MerchantMember_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StaffInvitation` (
  `id` VARCHAR(191) NOT NULL,
  `merchantId` VARCHAR(191) NOT NULL,
  `inviteeId` VARCHAR(191) NOT NULL,
  `invitedById` VARCHAR(191) NOT NULL,
  `role` ENUM('OWNER','STAFF') NOT NULL DEFAULT 'STAFF',
  `status` ENUM('PENDING','ACCEPTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `StaffInvitation_inviteeId_status_expiresAt_idx`(`inviteeId`,`status`,`expiresAt`),
  INDEX `StaffInvitation_merchantId_status_idx`(`merchantId`,`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MerchantMember` ADD CONSTRAINT `MerchantMember_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `Merchant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MerchantMember` ADD CONSTRAINT `MerchantMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `StaffInvitation` ADD CONSTRAINT `StaffInvitation_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `Merchant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffInvitation` ADD CONSTRAINT `StaffInvitation_inviteeId_fkey` FOREIGN KEY (`inviteeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `StaffInvitation` ADD CONSTRAINT `StaffInvitation_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `MerchantMember` (`id`,`merchantId`,`userId`,`role`,`createdAt`,`updatedAt`)
SELECT CONCAT('owner_', `id`), `id`, `ownerId`, 'OWNER', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Merchant` WHERE `ownerId` IS NOT NULL;
