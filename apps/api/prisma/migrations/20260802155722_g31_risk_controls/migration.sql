-- CreateTable
CREATE TABLE `RiskFlag` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `type` VARCHAR(60) NOT NULL,
    `severity` VARCHAR(20) NOT NULL DEFAULT 'LOW',
    `metadata` JSON NULL,
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedBy` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RiskFlag_userId_type_createdAt_idx`(`userId`, `type`, `createdAt`),
    INDEX `RiskFlag_type_resolved_createdAt_idx`(`type`, `resolved`, `createdAt`),
    INDEX `RiskFlag_ipAddress_createdAt_idx`(`ipAddress`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(40) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(200) NOT NULL,
    `description` VARCHAR(2000) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `handledBy` VARCHAR(191) NULL,
    `handledAt` DATETIME(3) NULL,
    `notes` VARCHAR(2000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Report_reporterId_createdAt_idx`(`reporterId`, `createdAt`),
    INDEX `Report_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
