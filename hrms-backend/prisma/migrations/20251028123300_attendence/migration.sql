/*
  Warnings:

  - You are about to drop the column `timestamp` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Attendance` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE');

-- DropIndex
DROP INDEX "public"."Attendance_employeeId_timestamp_idx";

-- AlterTable
ALTER TABLE "public"."Attendance" DROP COLUMN "timestamp",
DROP COLUMN "type",
ADD COLUMN     "attendanceDate" TIMESTAMP(3),
ADD COLUMN     "checkIn" TIMESTAMP(3),
ADD COLUMN     "checkOut" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "public"."AttendanceStatus" DEFAULT 'PRESENT',
ADD COLUMN     "totalHours" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- DropEnum
DROP TYPE "public"."AttendanceType";

-- CreateIndex
CREATE INDEX "Attendance_employeeId_attendanceDate_idx" ON "public"."Attendance"("employeeId", "attendanceDate");
