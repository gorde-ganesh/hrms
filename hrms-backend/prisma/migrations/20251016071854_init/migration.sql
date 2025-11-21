/*
  Warnings:

  - You are about to drop the column `userId` on the `Attendance` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Attendance" DROP CONSTRAINT "Attendance_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Attendance" DROP COLUMN "userId";
