-- DropForeignKey
ALTER TABLE "account_categories" DROP CONSTRAINT "account_categories_accountId_fkey";

-- AddForeignKey
ALTER TABLE "account_categories" ADD CONSTRAINT "account_categories_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
