import type { Product, Sale, Return, Expense, FlashSale } from './types';

export const placeholderProducts: Product[] = [
  { id: 'prod-001', name: 'ECERAN PUTIH 25 X 30 CM', costPrice: 3750, sellingPrice: 4250, stock: 0, category: 'Eceran' },
  { id: 'prod-002', name: 'GLASWOOL 1M KUNING', costPrice: 10168, sellingPrice: 22500, stock: 0, category: 'Glaswool' },
  { id: 'prod-003', name: 'GLASWOOL 50 CM KUNING', costPrice: 5084, sellingPrice: 17499, stock: 0, category: 'Glaswool' },
  { id: 'prod-004', name: 'Ongkos kirim', costPrice: 0, sellingPrice: 150000, stock: 0, category: 'Lainnya' },
  { id: 'prod-005', name: 'PUTIH 100X60 CM', costPrice: 30000, sellingPrice: 69699, stock: 0, category: 'Putih' },
  { id: 'prod-006', name: 'PUTIH 30X30 CM', costPrice: 4500, sellingPrice: 6999, stock: 0, category: 'Putih' },
  { id: 'prod-007', name: 'PUTIH 30X60 CM', costPrice: 9000, sellingPrice: 20999, stock: 0, category: 'Putih' },
  { id: 'prod-008', name: 'PUTIH 40X30 CM', costPrice: 6000, sellingPrice: 7999, stock: 0, category: 'Putih' },
  { id: 'prod-009', name: 'Putih 25mm 100x60', costPrice: 76000, sellingPrice: 110000, stock: 0, category: 'Putih' },
  { id: 'prod-010', name: 'Putih 25mm 30x60cm', costPrice: 22500, sellingPrice: 40000, stock: 0, category: 'Putih' },
  { id: 'prod-011', name: 'Putih 50 x 60 cm', costPrice: 15000, sellingPrice: 38500, stock: 0, category: 'Putih' },
  { id: 'prod-012', name: 'RAMBUT NENEK 1kg', costPrice: 17500, sellingPrice: 24999, stock: 0, category: 'Rambut Nenek' },
  { id: 'prod-013', name: 'RAMBUT NENEK 250gr', costPrice: 4375, sellingPrice: 6500, stock: 0, category: 'Rambut Nenek' },
  { id: 'prod-014', name: 'RAMBUT NENEK 500gr', costPrice: 8750, sellingPrice: 12500, stock: 0, category: 'Rambut Nenek' },
  { id: 'prod-015', name: 'ROLL GLASWOLL KUNING 1625', costPrice: 305000, sellingPrice: 420000, stock: 0, category: 'Glaswool' },
  { id: 'prod-016', name: 'ROLL GLASWOLL PUTIHN 20 M * 60CM', costPrice: 600000, sellingPrice: 800000, stock: 0, category: 'Glaswool' },
  { id: 'prod-017', name: 'Resi Jariah Paket Shopee', costPrice: 1250, sellingPrice: 1250, stock: 0, category: 'Lainnya' },
  { id: 'prod-018', name: 'extra buble', costPrice: 400, sellingPrice: 400, stock: 0, category: 'Lainnya' },
  { id: 'prod-019', name: 'kuning 20 x 120', costPrice: 2034, sellingPrice: 4999, stock: 0, category: 'Kuning' },
  { id: 'prod-020', name: 'kuning 28x37', costPrice: 990, sellingPrice: 2000, stock: 0, category: 'Kuning' },
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
