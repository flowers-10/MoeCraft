CREATE TABLE `Order` (
  `id` CHAR(36) NOT NULL, `orderNumber` VARCHAR(32) NOT NULL, `userId` VARCHAR(191) NOT NULL,
  `quoteId` CHAR(36) NOT NULL, `idempotencyKey` VARCHAR(100) NOT NULL, `requestHash` CHAR(64) NOT NULL,
  `status` ENUM('PENDING_PAYMENT','PAID','PARTIALLY_SHIPPED','SHIPPED','COMPLETED','CANCELLED','AFTER_SALE','CLOSED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  `currency` CHAR(3) NOT NULL DEFAULT 'CNY', `originalAmount` DECIMAL(10,2) NOT NULL,
  `shippingAmount` DECIMAL(10,2) NOT NULL DEFAULT 0, `discountAmount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `payableAmount` DECIMAL(10,2) NOT NULL, `addressSnapshot` JSON NOT NULL, `couponCode` VARCHAR(40) NULL,
  `expiresAt` DATETIME(3) NOT NULL, `paidAt` DATETIME(3) NULL, `cancelledAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Order_orderNumber_key` (`orderNumber`), UNIQUE INDEX `Order_quoteId_key` (`quoteId`),
  UNIQUE INDEX `Order_userId_idempotencyKey_key` (`userId`,`idempotencyKey`),
  INDEX `Order_userId_createdAt_idx` (`userId`,`createdAt`), INDEX `Order_status_expiresAt_idx` (`status`,`expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Order_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `CheckoutQuote`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MerchantOrder` (
  `id` VARCHAR(191) NOT NULL, `orderId` CHAR(36) NOT NULL, `merchantId` VARCHAR(191) NOT NULL, `storeId` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING_PAYMENT','PAID','PARTIALLY_SHIPPED','SHIPPED','COMPLETED','CANCELLED','AFTER_SALE','CLOSED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  `currency` CHAR(3) NOT NULL DEFAULT 'CNY', `originalAmount` DECIMAL(10,2) NOT NULL, `shippingAmount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `discountAmount` DECIMAL(10,2) NOT NULL DEFAULT 0, `payableAmount` DECIMAL(10,2) NOT NULL, `merchantNote` VARCHAR(1000) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `MerchantOrder_orderId_storeId_key` (`orderId`,`storeId`), INDEX `MerchantOrder_merchantId_status_createdAt_idx` (`merchantId`,`status`,`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `MerchantOrder_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `MerchantOrder_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `Merchant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `MerchantOrder_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrderItem` (
  `id` CHAR(36) NOT NULL, `orderId` CHAR(36) NOT NULL, `merchantOrderId` VARCHAR(191) NOT NULL, `storeId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL, `skuId` VARCHAR(191) NOT NULL, `productTitle` VARCHAR(200) NOT NULL, `skuName` VARCHAR(160) NOT NULL,
  `coverFileId` VARCHAR(191) NULL, `quantity` INTEGER NOT NULL, `currency` CHAR(3) NOT NULL DEFAULT 'CNY',
  `unitPrice` DECIMAL(10,2) NOT NULL, `originalAmount` DECIMAL(10,2) NOT NULL, `discountAmount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `payableAmount` DECIMAL(10,2) NOT NULL, `pricingSnapshot` JSON NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `OrderItem_orderId_idx` (`orderId`), INDEX `OrderItem_merchantOrderId_idx` (`merchantOrderId`), INDEX `OrderItem_skuId_idx` (`skuId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `OrderItem_merchantOrderId_fkey` FOREIGN KEY (`merchantOrderId`) REFERENCES `MerchantOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrderEvent` (
  `id` VARCHAR(191) NOT NULL, `orderId` CHAR(36) NOT NULL, `actorId` VARCHAR(191) NULL,
  `fromStatus` ENUM('PENDING_PAYMENT','PAID','PARTIALLY_SHIPPED','SHIPPED','COMPLETED','CANCELLED','AFTER_SALE','CLOSED') NULL,
  `toStatus` ENUM('PENDING_PAYMENT','PAID','PARTIALLY_SHIPPED','SHIPPED','COMPLETED','CANCELLED','AFTER_SALE','CLOSED') NOT NULL,
  `type` VARCHAR(60) NOT NULL, `metadata` JSON NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `OrderEvent_orderId_createdAt_idx` (`orderId`,`createdAt`), PRIMARY KEY (`id`),
  CONSTRAINT `OrderEvent_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PaymentIntent` (
  `id` VARCHAR(191) NOT NULL, `orderId` CHAR(36) NOT NULL,
  `status` ENUM('PENDING','PROCESSING','SUCCEEDED','FAILED','CANCELLED','PARTIALLY_REFUNDED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `provider` VARCHAR(40) NOT NULL DEFAULT 'SANDBOX', `providerPaymentId` VARCHAR(100) NULL,
  `amount` DECIMAL(10,2) NOT NULL, `currency` CHAR(3) NOT NULL DEFAULT 'CNY', `expiresAt` DATETIME(3) NOT NULL,
  `paidAt` DATETIME(3) NULL, `closedAt` DATETIME(3) NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `PaymentIntent_orderId_key` (`orderId`), UNIQUE INDEX `PaymentIntent_providerPaymentId_key` (`providerPaymentId`),
  INDEX `PaymentIntent_status_expiresAt_idx` (`status`,`expiresAt`), PRIMARY KEY (`id`),
  CONSTRAINT `PaymentIntent_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
