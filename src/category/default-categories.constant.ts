import { CategoryType } from '@prisma/client';

export const DEFAULT_CATEGORIES = [
  {
    name: 'Продукты',
    type: CategoryType.EXPENSE,
    icon: 'shopping_cart',
  },
  {
    name: 'Кафе и рестораны',
    type: CategoryType.EXPENSE,
    icon: 'restaurant',
  },
  {
    name: 'Транспорт',
    type: CategoryType.EXPENSE,
    icon: 'directions_car',
  },
  {
    name: 'Жилье',
    type: CategoryType.EXPENSE,
    icon: 'home',
  },
  {
    name: 'Коммунальные услуги',
    type: CategoryType.EXPENSE,
    icon: 'bolt',
  },
  {
    name: 'Здоровье',
    type: CategoryType.EXPENSE,
    icon: 'favorite',
  },
  {
    name: 'Образование',
    type: CategoryType.EXPENSE,
    icon: 'school',
  },
  {
    name: 'Одежда',
    type: CategoryType.EXPENSE,
    icon: 'checkroom',
  },
  {
    name: 'Развлечения',
    type: CategoryType.EXPENSE,
    icon: 'celebration',
  },
  {
    name: 'Путешествия',
    type: CategoryType.EXPENSE,
    icon: 'flight',
  },
  {
    name: 'Связь и интернет',
    type: CategoryType.EXPENSE,
    icon: 'wifi',
  },
  {
    name: 'Страхование',
    type: CategoryType.EXPENSE,
    icon: 'shield',
  },
  {
    name: 'Кредиты',
    type: CategoryType.EXPENSE,
    icon: 'credit_card',
  },
  {
    name: 'Налоги',
    type: CategoryType.EXPENSE,
    icon: 'receipt',
  },
  {
    name: 'Питомцы',
    type: CategoryType.EXPENSE,
    icon: 'pets',
  },
  {
    name: 'Подарки',
    type: CategoryType.EXPENSE,
    icon: 'redeem',
  },
  {
    name: 'Ремонт',
    type: CategoryType.EXPENSE,
    icon: 'construction',
  },
  {
    name: 'Спорт',
    type: CategoryType.EXPENSE,
    icon: 'fitness_center',
  },
  {
    name: 'Красота',
    type: CategoryType.EXPENSE,
    icon: 'spa',
  },
  {
    name: 'Электроника',
    type: CategoryType.EXPENSE,
    icon: 'devices',
  },
  {
    name: 'Книги',
    type: CategoryType.EXPENSE,
    icon: 'menu_book',
  },
  {
    name: 'Алкоголь',
    type: CategoryType.EXPENSE,
    icon: 'wine_bar',
  },
  {
    name: 'Благотворительность',
    type: CategoryType.EXPENSE,
    icon: 'volunteer_activism',
  },
  {
    name: 'Дети',
    type: CategoryType.EXPENSE,
    icon: 'child_care',
  },
  {
    name: 'Хобби',
    type: CategoryType.EXPENSE,
    icon: 'palette',
  },
  {
    name: 'Такси',
    type: CategoryType.EXPENSE,
    icon: 'local_taxi',
  },
  {
    name: 'Парковка',
    type: CategoryType.EXPENSE,
    icon: 'local_parking',
  },
  {
    name: 'Кино и музыка',
    type: CategoryType.EXPENSE,
    icon: 'movie',
  },
  {
    name: 'Подписки',
    type: CategoryType.EXPENSE,
    icon: 'subscriptions',
  },
  {
    name: 'Зарплата',
    type: CategoryType.INCOME,
    icon: 'work',
  },
  {
    name: 'Фриланс',
    type: CategoryType.INCOME,
    icon: 'currency_exchange',
  },
  {
    name: 'Инвестиции',
    type: CategoryType.INCOME,
    icon: 'trending_up',
  },
  {
    name: 'Подарки',
    type: CategoryType.INCOME,
    icon: 'card_giftcard',
  },
  {
    name: 'Проценты',
    type: CategoryType.INCOME,
    icon: 'savings',
  },
  {
    name: 'Возврат долгов',
    type: CategoryType.INCOME,
    icon: 'paid',
  },
  {
    name: 'Дивиденды',
    type: CategoryType.INCOME,
    icon: 'pie_chart',
  },
];
