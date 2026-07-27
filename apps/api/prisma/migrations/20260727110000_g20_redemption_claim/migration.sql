ALTER TABLE `CouponRedemption`
  ADD COLUMN `claimId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `CouponRedemption_claimId_key`
  ON `CouponRedemption`(`claimId`);

ALTER TABLE `CouponRedemption`
  ADD CONSTRAINT `CouponRedemption_claimId_fkey`
  FOREIGN KEY (`claimId`) REFERENCES `CouponClaim`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
