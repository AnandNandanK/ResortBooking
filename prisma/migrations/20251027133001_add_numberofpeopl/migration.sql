/*
  Warnings:

  - Added the required column `numberOfPerson` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `booking` ADD COLUMN `numberOfPerson` INTEGER NOT NULL;
