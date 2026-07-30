CREATE TABLE `PaymentEvent` (
  `id` VARCHAR(191) NOT NULL,
  `paymentIntentId` VARCHAR(191) NULL,
  `provider` VARCHAR(40) NOT NULL,
  `providerEventId` VARCHAR(120) NOT NULL,
  `eventType` VARCHAR(60) NOT NULL,
  `rawBody` LONGTEXT NOT NULL,
  `eventData` JSON NOT NULL,
  `signatureValid` BOOLEAN NOT NULL DEFAULT false,
  `ignored` BOOLEAN NOT NULL DEFAULT false,
  `errorCode` VARCHAR(80) NULL,
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PaymentEvent_providerEventId_key` (`providerEventId`),
  INDEX `PaymentEvent_paymentIntentId_createdAt_idx` (`paymentIntentId`,`createdAt`),
  INDEX `PaymentEvent_processedAt_createdAt_idx` (`processedAt`,`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PaymentEvent_paymentIntentId_fkey` FOREIGN KEY (`paymentIntentId`) REFERENCES `PaymentIntent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
