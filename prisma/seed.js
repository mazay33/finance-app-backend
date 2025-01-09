const { PrismaClient, AccountTypeEnum } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accountTypes = [
    { name: AccountTypeEnum.CASH },
    { name: AccountTypeEnum.DEBIT_CARD },
    { name: AccountTypeEnum.CREDIT_CARD },
    { name: AccountTypeEnum.VIRTUAL_ACCOUNT },
    { name: AccountTypeEnum.INVESTMENT },
    { name: AccountTypeEnum.RECEIVABLES },
    { name: AccountTypeEnum.PAYABLES },
  ];

  console.log('Добавляем типы счетов в таблицу AccountType...');

  for (const type of accountTypes) {
    await prisma.accountType.upsert({
      where: { name: type.name },
      update: {},
      create: { ...type },
    });
  }

  console.log('Типы счетов успешно добавлены.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
