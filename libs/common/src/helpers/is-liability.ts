import { AccountType } from "@prisma/client";

export const isLiability = (type: AccountType): boolean => {
  const liabilities: AccountType[] = [AccountType.CREDIT_CARD, AccountType.PAYABLES];
  return liabilities.some(t => t === type);
};
