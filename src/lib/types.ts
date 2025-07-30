export interface Product {
  id: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  category: string;
}

export interface SaleItem {
  product: Product; // On client side, this is a full object.
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discount: number; // percentage
  finalTotal: number;
  date: Date;
}

export interface Return {
  id: string;
  saleId: string;
  productName: string;
  quantity: number;
  reason: string;
  date: Date;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: 'Operasional' | 'Gaji' | 'Pemasaran' | 'Lainnya';
  date: Date;
}

export interface FlashSale {
    id: string;
    productName: string;
    discountPrice: number;
    startTime: Date;
    endTime: Date;
}

export interface Settings {
  id?: string; // id is 'main'
  storeName: string;
  defaultDiscount: number;
}

export type UserRole = 'admin' | 'kasir';
