/*
  Warnings:

  - You are about to drop the column `receiverId` on the `Message` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeId,year,leaveType]` on the table `LeaveBalance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Conversation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ChannelType" AS ENUM ('DM', 'GROUP', 'PUBLIC_CHANNEL', 'PRIVATE_CHANNEL');

-- CreateEnum
CREATE TYPE "public"."LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID');

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_receiverId_fkey";

-- DropIndex
DROP INDEX "public"."LeaveBalance_employeeId_year_key";

-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "channelType" "public"."ChannelType" NOT NULL DEFAULT 'DM',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "huddleActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHuddle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."ConversationMember" ADD COLUMN     "lastReadAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Leave" ADD COLUMN     "leaveType" "public"."LeaveType" NOT NULL DEFAULT 'ANNUAL';

-- AlterTable
ALTER TABLE "public"."LeaveBalance" ADD COLUMN     "leaveType" "public"."LeaveType" NOT NULL DEFAULT 'ANNUAL';

-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "receiverId";

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_year_leaveType_key" ON "public"."LeaveBalance"("employeeId", "year", "leaveType");
