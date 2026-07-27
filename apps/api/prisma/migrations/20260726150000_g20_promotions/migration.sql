CREATE TABLE `Coupon` (
  `id` VARCHAR(191) NOT NULL, `storeId` VARCHAR(191) NOT NULL, `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(160) NOT NULL, `type` ENUM('FIXED','PERCENTAGE') NOT NULL,
  `value` DECIMAL(10,2) NOT NULL, `minimumAmount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `startsAt` DATETIME(3) NOT NULL, `endsAt` DATETIME(3) NOT NULL,
  `status` ENUM('ACTIVE','PAUSED') NOT NULL DEFAULT 'ACTIVE',
  `totalLimit` INTEGER NOT NULL, `perUserLimit` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Coupon_code_key`(`code`), INDEX `Coupon_storeId_status_endsAt_idx`(`storeId`,`status`,`endsAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `CouponProduct` (
  `couponId` VARCHAR(191) NOT NULL, `productId` VARCHAR(191) NOT NULL,
  INDEX `CouponProduct_productId_idx`(`productId`), PRIMARY KEY (`couponId`,`productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `CouponClaim` (
  `id` VARCHAR(191) NOT NULL, `couponId` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
  `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `CouponClaim_couponId_userId_idx`(`couponId`,`userId`), INDEX `CouponClaim_userId_claimedAt_idx`(`userId`,`claimedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `CouponRedemption` (
  `id` VARCHAR(191) NOT NULL, `couponId` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL, `originalAmount` DECIMAL(10,2) NOT NULL, `discountAmount` DECIMAL(10,2) NOT NULL,
  `ruleSnapshot` JSON NOT NULL, `usedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CouponRedemption_orderId_key`(`orderId`), INDEX `CouponRedemption_couponId_usedAt_idx`(`couponId`,`usedAt`),
  INDEX `CouponRedemption_userId_usedAt_idx`(`userId`,`usedAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CouponProduct` ADD CONSTRAINT `CouponProduct_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CouponProduct` ADD CONSTRAINT `CouponProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CouponClaim` ADD CONSTRAINT `CouponClaim_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CouponClaim` ADD CONSTRAINT `CouponClaim_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CouponRedemption` ADD CONSTRAINT `CouponRedemption_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `Coupon`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CouponRedemption` ADD CONSTRAINT `CouponRedemption_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
