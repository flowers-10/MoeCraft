-- CreateTable
CREATE TABLE `ProductReviewEvent` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL,
    `toStatus` ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL,
    `reason` VARCHAR(1000) NULL,
    `fieldFeedback` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductReviewEvent_productId_createdAt_idx`(`productId`, `createdAt`),
    INDEX `ProductReviewEvent_toStatus_createdAt_idx`(`toStatus`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductReviewEvent` ADD CONSTRAINT `ProductReviewEvent_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
