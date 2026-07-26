-- Switch SKU pricing from integer fen (分) to DECIMAL(10,2) yuan (元).
-- Values are converted in place: 129900 fen -> 1299.00 yuan.
ALTER TABLE `Sku` MODIFY COLUMN `priceAmount` DECIMAL(10,2) NOT NULL;

UPDATE `Sku` SET `priceAmount` = `priceAmount` / 100;

-- Money is never negative. The "minimum 1.00 yuan" rule is enforced at
-- submission time so merchants can still save incomplete drafts.
ALTER TABLE `Sku` ADD CONSTRAINT `Sku_priceAmount_non_negative` CHECK (`priceAmount` >= 0);
