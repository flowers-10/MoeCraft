-- AlterTable
ALTER TABLE `Sku` ADD COLUMN `purchaseLimit` INTEGER NULL;

-- CreateTable
CREATE TABLE `Cart` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `guestToken` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Cart_userId_key`(`userId`),
    UNIQUE INDEX `Cart_guestToken_key`(`guestToken`),
    INDEX `Cart_guestToken_idx`(`guestToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CartItem` (
    `id` VARCHAR(191) NOT NULL,
    `cartId` VARCHAR(191) NOT NULL,
    `skuId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `selected` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CartItem_skuId_idx`(`skuId`),
    UNIQUE INDEX `CartItem_cartId_skuId_key`(`cartId`, `skuId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cart` ADD CONSTRAINT `Cart_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `Cart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_skuId_fkey` FOREIGN KEY (`skuId`) REFERENCES `Sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cart quantity must stay positive; zero-quantity rows are deleted by the service.
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_quantity_check` CHECK (`quantity` > 0);
ALTER TABLE `Sku` ADD CONSTRAINT `Sku_purchaseLimit_check` CHECK (`purchaseLimit` IS NULL OR `purchaseLimit` > 0);
