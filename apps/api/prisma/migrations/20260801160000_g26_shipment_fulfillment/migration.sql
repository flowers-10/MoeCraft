-- AlterTable
ALTER TABLE `Job` MODIFY `type` ENUM('CLOSE_EXPIRED_ORDER', 'AUTO_CONFIRM_RECEIPT') NOT NULL;

-- CreateTable
CREATE TABLE `Shipment` (
    `id` VARCHAR(191) NOT NULL,
    `merchantOrderId` VARCHAR(191) NOT NULL,
    `carrier` VARCHAR(40) NOT NULL,
    `trackingNumber` VARCHAR(80) NOT NULL,
    `status` ENUM('SHIPPED', 'DELIVERED') NOT NULL DEFAULT 'SHIPPED',
    `note` VARCHAR(500) NULL,
    `shippedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deliveredAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Shipment_merchantOrderId_createdAt_idx`(`merchantOrderId`, `createdAt`),
    UNIQUE INDEX `Shipment_merchantOrderId_carrier_trackingNumber_key`(`merchantOrderId`, `carrier`, `trackingNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShipmentItem` (
    `id` VARCHAR(191) NOT NULL,
    `shipmentId` VARCHAR(191) NOT NULL,
    `orderItemId` CHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL,

    INDEX `ShipmentItem_orderItemId_idx`(`orderItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_merchantOrderId_fkey` FOREIGN KEY (`merchantOrderId`) REFERENCES `MerchantOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentItem` ADD CONSTRAINT `ShipmentItem_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentItem` ADD CONSTRAINT `ShipmentItem_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

