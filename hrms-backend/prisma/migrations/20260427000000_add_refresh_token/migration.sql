-- AlterTable
ALTER TABLE "User" ADD COLUMN "refreshToken" TEXT,
ADD COLUMN "refreshTokenExp" TIMESTAMP(3);
