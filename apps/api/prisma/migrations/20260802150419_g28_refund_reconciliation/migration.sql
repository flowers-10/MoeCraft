-- CreateTable
CREATE TABLE `RefundRecord` (
    `id` VARCHAR(191) NOT NULL,
    `paymentIntentId` VARCHAR(191) NOT NULL,
    `idempotencyKey` VARCHAR(100) NOT NULL,
    `providerRefundId` VARCHAR(100) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'CNY',
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `errorReason` VARCHAR(1000) NULL,
    `metadata` JSON NULL,
    `callbackRaw` JSON NULL,
    `creatorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RefundRecord_providerRefundId_key`(`providerRefundId`),
    INDEX `RefundRecord_paymentIntentId_createdAt_idx`(`paymentIntentId`, `createdAt`),
    INDEX `RefundRecord_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `RefundRecord_paymentIntentId_idempotencyKey_key`(`paymentIntentId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reconciliation` (
    `id` VARCHAR(191) NOT NULL,
    `date` VARCHAR(10) NOT NULL,
    `source` VARCHAR(40) NOT NULL DEFAULT 'PAYMENT_PROVIDER',
    `fileName` VARCHAR(255) NOT NULL,
    `totalExpected` DECIMAL(10, 2) NOT NULL,
    `totalMatched` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `matchedCount` INTEGER NOT NULL DEFAULT 0,
    `unmatchedCount` INTEGER NOT NULL DEFAULT 0,
    `discrepancies` JSON NOT NULL,
    `status` ENUM('PENDING', 'REVIEWING', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
    `resolvedBy` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `notes` VARCHAR(2000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Reconciliation_date_source_idx`(`date`, `source`),
    INDEX `Reconciliation_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
