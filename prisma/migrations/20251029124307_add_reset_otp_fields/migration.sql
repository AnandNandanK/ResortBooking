-- AlterTable
ALTER TABLE `user` ADD COLUMN `resetOtp` VARCHAR(191) NULL,
    ADD COLUMN `resetOtpExpiry` DATETIME(3) NULL,
    ADD COLUMN `resetOtpVerified` BOOLEAN NULL DEFAULT false;
