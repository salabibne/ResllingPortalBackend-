-- Reseller profile verification: NID number and full present address.
-- AlterTable
ALTER TABLE `user` ADD COLUMN `nid_number` VARCHAR(20) NULL,
    ADD COLUMN `present_address` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_nid_number_key` ON `user`(`nid_number`);
