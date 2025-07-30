

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

export interface SubCategory {
  id: string;
  name: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  subcategories: SubCategory[];
}

export interface Product {
  id: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  category: string;
  subcategory?: string;
}

export interface SaleItem {
  product: {
    id: string;
    name: string;
    category: string;
    subcategory?: string;
    costPrice: number;
  };
  quantity: number;
  price: number; // This is the selling price before discount
  costPriceAtSale: number; // Cost price at the time of sale
}

export interface Sale {
  id: string;
  displayId?: number; // Optional display-only ID
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
  priceAtSale: number; // Selling price at the time of sale, before discount
  costPriceAtSale: number;
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
  category: string;
  subcategory?: string;
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
  theme: 'default' | 'colorful' | 'dark';
  categories?: Category[];
  expenseCategories?: ExpenseCategory[];
}

export interface StockOpnameLog {
    id: string;
    date: Date;
    productId: string;
    productName: string;
    previousStock: number;
    newStock: number;
    notes: string;
    user: UserRole;
}

export interface ActivityLog {
    id: string;
    date: Date;
    user: UserRole;
    description: string;
}


export type UserRole = 'admin' | 'kasir';
