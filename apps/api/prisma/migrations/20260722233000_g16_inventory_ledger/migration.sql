-- AlterTable
ALTER TABLE `Sku` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Inventory` ADD COLUMN `lowStockThreshold` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `InventoryLedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryId` VARCHAR(191) NOT NULL,
    `type` ENUM('INITIAL_STOCK', 'ADJUSTMENT', 'RESERVATION_CREATED', 'RESERVATION_COMMITTED', 'RESERVATION_RELEASED') NOT NULL,
    `onHandDelta` INTEGER NOT NULL,
    `reservedDelta` INTEGER NOT NULL,
    `onHandAfter` INTEGER NOT NULL,
    `reservedAfter` INTEGER NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InventoryLedgerEntry_inventoryId_createdAt_idx`(`inventoryId`, `createdAt`),
    INDEX `InventoryLedgerEntry_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryReservation` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryId` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NOT NULL,
    `committedAt` DATETIME(3) NULL,
    `releasedAt` DATETIME(3) NULL,
    `releaseReason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryReservation_status_expiresAt_idx`(`status`, `expiresAt`),
    UNIQUE INDEX `InventoryReservation_inventoryId_referenceId_key`(`inventoryId`, `referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Existing inventory becomes the opening balance for the immutable ledger.
INSERT INTO `InventoryLedgerEntry` (`id`, `inventoryId`, `type`, `onHandDelta`, `reservedDelta`, `onHandAfter`, `reservedAfter`, `reason`, `createdAt`)
SELECT CONCAT('g16_', `id`), `id`, 'INITIAL_STOCK', `onHand`, `reserved`, `onHand`, `reserved`, 'G16 库存台账初始化', CURRENT_TIMESTAMP(3)
FROM `Inventory`;

-- AddForeignKey
ALTER TABLE `InventoryLedgerEntry` ADD CONSTRAINT `InventoryLedgerEntry_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `Inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryReservation` ADD CONSTRAINT `InventoryReservation_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `Inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database-level inventory invariants protect every caller, including future order jobs.
ALTER TABLE `Inventory` ADD CONSTRAINT `Inventory_non_negative_check` CHECK (`onHand` >= 0 AND `reserved` >= 0 AND `reserved` <= `onHand` AND `lowStockThreshold` >= 0);
ALTER TABLE `InventoryReservation` ADD CONSTRAINT `InventoryReservation_quantity_check` CHECK (`quantity` > 0);
