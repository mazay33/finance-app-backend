/*
  Warnings:

  - You are about to drop the column `accountTypeId` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the `account_types` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,name,currency,type]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'VIRTUAL_ACCOUNT', 'INVESTMENT', 'RECEIVABLES', 'PAYABLES');

-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_accountTypeId_fkey";

-- DropIndex
DROP INDEX "accounts_userId_name_currency_accountTypeId_key";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "accountTypeId",
ADD COLUMN     "type" "AccountType" NOT NULL DEFAULT 'CASH';

-- DropTable
DROP TABLE "account_types";

-- DropEnum
DROP TYPE "AccountTypeEnum";

-- CreateIndex
CREATE UNIQUE INDEX "accounts_userId_name_currency_type_key" ON "accounts"("userId", "name", "currency", "type");
