CREATE TABLE `Address` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `recipient` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `country` VARCHAR(80) NOT NULL,
  `province` VARCHAR(80) NOT NULL,
  `city` VARCHAR(80) NOT NULL,
  `district` VARCHAR(80) NOT NULL,
  `addressLine` VARCHAR(240) NOT NULL,
  `postalCode` VARCHAR(20) NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `Address_userId_isDefault_updatedAt_idx` (`userId`, `isDefault`, `updatedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Address_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
