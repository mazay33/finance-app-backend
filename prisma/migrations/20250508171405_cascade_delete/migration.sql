-- DropForeignKey
ALTER TABLE "account_members" DROP CONSTRAINT "account_members_accountId_fkey";

-- AddForeignKey
ALTER TABLE "account_members" ADD CONSTRAINT "account_members_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
