import type { Product, Sale, Return, Expense, FlashSale } from './types';

export const placeholderProducts: Product[] = [
  { id: 'prod-001', name: 'Kopi Susu Gula Aren', costPrice: 12000, sellingPrice: 18000, stock: 50, category: 'Minuman' },
  { id: 'prod-002', name: 'Croissant Cokelat', costPrice: 15000, sellingPrice: 22000, stock: 30, category: 'Roti' },
  { id: 'prod-003', name: 'Teh Melati', costPrice: 8000, sellingPrice: 15000, stock: 100, category: 'Minuman' },
  { id: 'prod-004', name: 'Nasi Goreng Spesial', costPrice: 20000, sellingPrice: 35000, stock: 25, category: 'Makanan' },
  { id: 'prod-005', name: 'Air Mineral', costPrice: 3000, sellingPrice: 5000, stock: 200, category: 'Minuman' },
  { id: 'prod-006', name: 'Roti Bakar Keju', costPrice: 10000, sellingPrice: 18000, stock: 40, category: 'Roti' },
];

export const placeholderSales: Sale[] = [
  {
    id: 'sale-001',
    items: [
      { product: placeholderProducts[0], quantity: 2, price: 18000 },
      { product: placeholderProducts[1], quantity: 1, price: 22000 },
    ],
    subtotal: 58000,
    discount: 10,
    finalTotal: 52200,
    date: new Date('2023-10-26T10:00:00Z'),
  },
  {
    id: 'sale-002',
    items: [
      { product: placeholderProducts[3], quantity: 1, price: 35000 },
    ],
    subtotal: 35000,
    discount: 0,
    finalTotal: 35000,
    date: new Date('2023-10-26T12:30:00Z'),
  },
  {
    id: 'sale-003',
    items: [
      { product: placeholderProducts[2], quantity: 3, price: 15000 },
       { product: placeholderProducts[0], quantity: 1, price: 18000 },
    ],
    subtotal: 63000,
    discount: 5,
    finalTotal: 59850,
    date: new Date('2023-10-27T14:00:00Z'),
  },
];

export const placeholderReturns: Return[] = [
    { id: 'ret-001', saleId: 'sale-001', productName: 'Kopi Susu Gula Aren', quantity: 1, reason: 'Rasa tidak sesuai', date: new Date('2023-10-26T11:00:00Z') },
];

export const placeholderExpenses: Expense[] = [
    { id: 'exp-001', name: 'Sewa Tempat', amount: 2000000, category: 'Operasional', date: new Date('2023-10-01')},
    { id: 'exp-002', name: 'Gaji Karyawan', amount: 5000000, category: 'Gaji', date: new Date('2023-10-25')},
    { id: 'exp-003', name: 'Iklan Media Sosial', amount: 500000, category: 'Pemasaran', date: new Date('2023-10-15')},
    { id: 'exp-004', name: 'Beli Bahan Baku', amount: 3000000, category: 'Operasional', date: new Date('2023-10-10')},
];

export const placeholderFlashSales: FlashSale[] = [
    { id: 'fs-001', productName: 'Croissant Cokelat', discountPrice: 18000, startTime: new Date('2023-10-28T14:00:00Z'), endTime: new Date('2023-10-28T16:00:00Z') },
    { id: 'fs-002', productName: 'Nasi Goreng Spesial', discountPrice: 28000, startTime: new Date('2023-10-29T18:00:00Z'), endTime: new Date('2023-10-29T20:00:00Z') },
];
