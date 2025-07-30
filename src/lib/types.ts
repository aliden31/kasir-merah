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
  costPriceAtSale?: number; // Cost price at the time of sale
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discount: number; // percentage
  finalTotal: number;
  date: Date;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtSale: number;
  costPriceAtSale?: number;
}

export interface Return {
  id:string;
  saleId: string;
  items: ReturnItem[];
  reason: string;
  date: Date;
  totalRefund: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: 'Operasional' | 'Gaji' | 'Pemasaran' | 'Lainnya';
  date: Date;
}

export interface FlashSaleProduct extends Product {
  discountPrice: number;
}

export interface FlashSale {
    id: string; // Will be 'main'
    title: string;
    isActive: boolean;
    products: FlashSaleProduct[];
}

export interface Settings {
  id?: string; // id is 'main'
  storeName: string;
  defaultDiscount: number;
  syncCostPrice: boolean;
  theme: 'default' | 'colorful';
}

export type UserRole = 'admin' | 'kasir';
