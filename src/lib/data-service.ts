import { db } from './firebase';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  Timestamp,
} from 'firebase/firestore';
import type { Product, Sale, Return, Expense, FlashSale, SaleItem } from './types';
import { placeholderProducts } from './placeholder-data';

// Generic Firestore interaction functions
async function getCollection<T>(collectionName: string): Promise<T[]> {
  const q = query(collection(db, collectionName));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

async function addDocument<T>(collectionName: string, data: Omit<T, 'id'>): Promise<T> {
  const docRef = await addDoc(collection(db, collectionName), data);
  return { id: docRef.id, ...data } as T;
}

async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, data);
}

async function deleteDocument(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

// Product-specific functions
export const getProducts = () => getCollection<Product>('products');
export const addProduct = (product: Omit<Product, 'id'>) => addDocument<Product>('products', product);
export const updateProduct = (id: string, product: Partial<Product>) => updateDocument<Product>('products', id, product);
export const deleteProduct = (id: string) => deleteDocument('products', id);
export const addPlaceholderProducts = async () => {
    const batch = writeBatch(db);
    const productsCollection = collection(db, 'products');
    
    placeholderProducts.forEach(product => {
        // Create a new document reference for each placeholder product without specifying an ID
        const docRef = doc(productsCollection); 
        // We omit the 'id' field from the placeholder product data
        const { id, ...productData } = product;
        batch.set(docRef, productData);
    });

    await batch.commit();
}


// Sale-specific functions
export async function getSales(): Promise<Sale[]> {
    const salesData = await getCollection<any>('sales');
    return salesData.map(sale => ({
        ...sale,
        date: (sale.date as Timestamp).toDate(),
    }));
}

export const addSale = async (sale: Omit<Sale, 'id'>): Promise<Sale> => {
    // 1. Convert product objects to simple IDs for storing in Firestore
    const saleDataForFirestore = {
        ...sale,
        items: sale.items.map(item => ({
            ...item,
            product: item.product.id // Store only product ID
        })),
        date: Timestamp.fromDate(sale.date)
    };

    // 2. Add the sale document
    const docRef = await addDoc(collection(db, "sales"), saleDataForFirestore);

    // 3. Update stock for each product in the sale
    const batch = writeBatch(db);
    sale.items.forEach(item => {
        const productRef = doc(db, "products", item.product.id);
        const newStock = item.product.stock - item.quantity;
        batch.update(productRef, { stock: newStock });
    });
    await batch.commit();
    
    return { ...sale, id: docRef.id };
}


// Expense-specific functions
export async function getExpenses(): Promise<Expense[]> {
    const expensesData = await getCollection<any>('expenses');
    return expensesData.map(expense => ({
        ...expense,
        date: (expense.date as Timestamp).toDate(),
    }));
}

export const addExpense = (expense: Omit<Expense, 'id'>) => {
    return addDocument<Expense>('expenses', {
        ...expense,
        date: Timestamp.fromDate(expense.date)
    });
};

// Return-specific functions
export async function getReturns(): Promise<Return[]> {
    const returnsData = await getCollection<any>('returns');
    return returnsData.map(r => ({
        ...r,
        date: (r.date as Timestamp).toDate(),
    }));
}

export const addReturn = (item: Omit<Return, 'id'>) => {
    return addDocument<Return>('returns', {
        ...item,
        date: Timestamp.fromDate(item.date)
    });
};


// FlashSale-specific functions
export async function getFlashSales(): Promise<FlashSale[]> {
    const flashSalesData = await getCollection<any>('flash-sales');
    return flashSalesData.map(fs => ({
        ...fs,
        startTime: (fs.startTime as Timestamp).toDate(),
        endTime: (fs.endTime as Timestamp).toDate(),
    }));
}

export const addFlashSale = (sale: Omit<FlashSale, 'id'>) => {
    return addDocument<FlashSale>('flash-sales', {
        ...sale,
        startTime: Timestamp.fromDate(sale.startTime),
        endTime: Timestamp.fromDate(sale.endTime)
    });
};
