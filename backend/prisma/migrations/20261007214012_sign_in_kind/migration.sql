-- CreateEnum
CREATE TYPE "SecretKind" AS ENUM ('PIN', 'PASSWORD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "secretKind" "SecretKind" NOT NULL DEFAULT 'PIN';
