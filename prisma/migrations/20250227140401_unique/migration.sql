/*
  Warnings:

  - A unique constraint covering the columns `[userId,name,currency,accountTypeId]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "accounts_userId_name_currency_key";

-- CreateIndex
CREATE UNIQUE INDEX "accounts_userId_name_currency_accountTypeId_key" ON "accounts"("userId", "name", "currency", "accountTypeId");
