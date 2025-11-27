import { Customer, MenuItem, Order } from '@/types';

const now = new Date();

export const mockMenuItems: MenuItem[] = [
  {
    id: 'item-espresso',
    name: 'اسبريسو دبل',
    category: 'مشروبات ساخنة',
    price: 18,
    isAvailable: true,
    prepTimeMinutes: 3,
  },
  {
    id: 'item-cappuccino',
    name: 'كابتشينو',
    category: 'مشروبات ساخنة',
    price: 22,
    isAvailable: true,
    prepTimeMinutes: 4,
  },
  {
    id: 'item-burger',
    name: 'سموكد بيف برجر',
    category: 'الطبق الرئيسي',
    price: 48,
    isAvailable: true,
    prepTimeMinutes: 15,
  },
  {
    id: 'item-salad',
    name: 'سلطة سوبر فود',
    category: 'مقبلات',
    price: 32,
    isAvailable: true,
    prepTimeMinutes: 7,
  },
  {
    id: 'item-tiramisu',
    name: 'تيراميسو',
    category: 'حلويات',
    price: 28,
    isAvailable: true,
    prepTimeMinutes: 5,
  },
];

export const mockCustomers: Customer[] = [
  {
    id: 'customer-sara',
    fullName: 'سارة المطيري',
    phone: '+966500000001',
    totalSpend: 820,
    visitCount: 6,
    lastOrderAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
    favoriteDish: 'سموكد بيف برجر',
  },
  {
    id: 'customer-ali',
    fullName: 'علي الشهري',
    phone: '+966500000002',
    totalSpend: 1240,
    visitCount: 9,
    lastOrderAt: new Date(now.getTime() - 1000 * 60 * 75).toISOString(),
    favoriteDish: 'اسبريسو دبل',
  },
  {
    id: 'customer-lina',
    fullName: 'لينا الحسن',
    phone: '+966500000003',
    totalSpend: 365,
    visitCount: 3,
    lastOrderAt: new Date(now.getTime() - 1000 * 60 * 140).toISOString(),
    favoriteDish: 'سلطة سوبر فود',
  },
];

export const mockOrders: Order[] = [
  {
    id: 'order-001',
    status: 'preparing',
    fulfillmentType: 'dine-in',
    tableNumber: 'A3',
    customer: mockCustomers[0],
    total: 86,
    items: [
      {
        id: 'order-001-item-1',
        menuItemId: 'item-burger',
        name: 'سموكد بيف برجر',
        price: 48,
        quantity: 1,
      },
      {
        id: 'order-001-item-2',
        menuItemId: 'item-tiramisu',
        name: 'تيراميسو',
        price: 28,
        quantity: 1,
      },
      {
        id: 'order-001-item-3',
        menuItemId: 'item-espresso',
        name: 'اسبريسو دبل',
        price: 10,
        quantity: 1,
      },
    ],
    createdAt: new Date(now.getTime() - 1000 * 60 * 25).toISOString(),
    source: 'قاعة العائلات',
    prepTimeMinutes: 15,
  },
  {
    id: 'order-002',
    status: 'new',
    fulfillmentType: 'pickup',
    customer: mockCustomers[1],
    total: 40,
    items: [
      {
        id: 'order-002-item-1',
        menuItemId: 'item-cappuccino',
        name: 'كابتشينو',
        price: 22,
        quantity: 1,
      },
      {
        id: 'order-002-item-2',
        menuItemId: 'item-espresso',
        name: 'اسبريسو دبل',
        price: 18,
        quantity: 1,
      },
    ],
    createdAt: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
    source: 'تطبيق المطعم',
  },
  {
    id: 'order-003',
    status: 'ready',
    fulfillmentType: 'dine-in',
    tableNumber: 'B2',
    customer: mockCustomers[2],
    total: 60,
    items: [
      {
        id: 'order-003-item-1',
        menuItemId: 'item-salad',
        name: 'سلطة سوبر فود',
        price: 32,
        quantity: 1,
      },
      {
        id: 'order-003-item-2',
        menuItemId: 'item-tiramisu',
        name: 'تيراميسو',
        price: 28,
        quantity: 1,
      },
    ],
    createdAt: new Date(now.getTime() - 1000 * 60 * 55).toISOString(),
    readyAt: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
    source: 'صالة الأفراد',
  },
];
