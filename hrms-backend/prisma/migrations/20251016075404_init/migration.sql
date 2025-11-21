/*
  Warnings:

  - You are about to drop the column `userId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Payroll` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Performance` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Leave" DROP CONSTRAINT "Leave_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Leave" DROP CONSTRAINT "Leave_managerApprovalId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Payroll" DROP CONSTRAINT "Payroll_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Performance" DROP CONSTRAINT "Performance_userId_fkey";

-- DropIndex
DROP INDEX "public"."Notification_userId_idx";

-- AlterTable
ALTER TABLE "public"."Notification" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "public"."Payroll" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "public"."Performance" DROP COLUMN "userId";

-- AddForeignKey
ALTER TABLE "public"."Leave" ADD CONSTRAINT "Leave_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Leave" ADD CONSTRAINT "Leave_managerApprovalId_fkey" FOREIGN KEY ("managerApprovalId") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
