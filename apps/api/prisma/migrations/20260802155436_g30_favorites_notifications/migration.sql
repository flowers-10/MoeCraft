-- CreateTable
CREATE TABLE `Favorite` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(20) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Favorite_userId_targetType_createdAt_idx`(`userId`, `targetType`, `createdAt`),
    INDEX `Favorite_targetType_targetId_idx`(`targetType`, `targetId`),
    UNIQUE INDEX `Favorite_userId_targetType_targetId_key`(`userId`, `targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(60) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(2000) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_isRead_createdAt_idx`(`userId`, `isRead`, `createdAt`),
    INDEX `Notification_userId_type_createdAt_idx`(`userId`, `type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
