-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `orderItemId` CHAR(36) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `content` VARCHAR(2000) NOT NULL,
    `images` JSON NOT NULL,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `replyContent` VARCHAR(1000) NULL,
    `repliedBy` VARCHAR(191) NULL,
    `repliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Review_orderItemId_key`(`orderItemId`),
    INDEX `Review_productId_isHidden_createdAt_idx`(`productId`, `isHidden`, `createdAt`),
    INDEX `Review_storeId_isHidden_createdAt_idx`(`storeId`, `isHidden`, `createdAt`),
    INDEX `Review_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
