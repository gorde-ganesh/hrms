/*
  Warnings:

  - You are about to drop the column `employeeId` on the `Employee` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeCode]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeeCode` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Employee_employeeId_key";

-- AlterTable
ALTER TABLE "public"."Employee" DROP COLUMN "employeeId",
ADD COLUMN     "employeeCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "public"."Employee"("employeeCode");
