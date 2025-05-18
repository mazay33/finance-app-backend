/*
  Warnings:

  - A unique constraint covering the columns `[userId,name,currency]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "accounts_userId_name_currency_key" ON "accounts"("userId", "name", "currency");
