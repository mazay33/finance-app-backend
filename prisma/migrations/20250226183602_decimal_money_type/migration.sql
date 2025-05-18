/*
  Warnings:

  - Changed the type of `balance` on the `accounts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `amount` on the `budgets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `targetAmount` on the `goals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `currentAmount` on the `goals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `amount` on the `transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "balance",
ADD COLUMN     "balance" MONEY NOT NULL;

-- AlterTable
ALTER TABLE "budgets" DROP COLUMN "amount",
ADD COLUMN     "amount" MONEY NOT NULL;

-- AlterTable
ALTER TABLE "goals" DROP COLUMN "targetAmount",
ADD COLUMN     "targetAmount" MONEY NOT NULL,
DROP COLUMN "currentAmount",
ADD COLUMN     "currentAmount" MONEY NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "amount",
ADD COLUMN     "amount" MONEY NOT NULL;
