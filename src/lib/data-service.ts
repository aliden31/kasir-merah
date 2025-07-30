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
  getDoc,
  setDoc,
} from 'firebase/firestore';
import type { Product, Sale, Return, Expense, FlashSale, Settings, SaleItem } from './types';
import { placeholderProducts } from './placeholder-data';

// Generic Firestore interaction functions
async function getCollection<T>(collectionName: string): Promise<T[]> {
  const q = query(collection(db, collectionName));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
}

async function getDocumentById<T>(collectionName: string, id: string): Promise<T | undefined> {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return undefined;
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
export const getProductById = (id: string) => getDocumentById<Product>('products', id);
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

export const addSale = async (sale: Omit<Sale, 'id'>, settings: Settings): Promise<Sale> => {
    // 1. Prepare sale items for Firestore
    const itemsForFirestore = sale.items.map(item => {
        const saleItem: any = {
            product: item.product.id, // Store only product ID
            quantity: item.quantity,
            price: item.price,
        };
        // If sync is enabled, store the current cost price.
        if (settings.syncCostPrice) {
            saleItem.costPriceAtSale = item.product.costPrice;
        }
        return saleItem;
    });

    const saleDataForFirestore = {
        ...sale,
        items: itemsForFirestore,
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
export const getFlashSaleSettings = async (): Promise<FlashSale> => {
    const docRef = doc(db, 'settings', 'flashSale');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: 'main', ...docSnap.data() } as FlashSale;
    } else {
        const defaultSettings: FlashSale = { id: 'main', title: 'Flash Sale', isActive: false, products: [] };
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    }
};

export const saveFlashSaleSettings = async (settings: FlashSale): Promise<void> => {
    const { id, ...settingsData } = settings;
    const docRef = doc(db, 'settings', 'flashSale');
    await setDoc(docRef, settingsData, { merge: true });
};

// Settings-specific functions
export const getSettings = async (): Promise<Settings> => {
    const docRef = doc(db, 'settings', 'main');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        // Merge with defaults to ensure new settings are present
        const defaultSettings: Settings = { storeName: 'Toko Cepat', defaultDiscount: 0, syncCostPrice: true };
        return { ...defaultSettings, ...docSnap.data() } as Settings;
    } else {
        // Return default settings if not found
        const defaultSettings: Settings = { storeName: 'Toko Cepat', defaultDiscount: 0, syncCostPrice: true };
        // Optionally, create the default settings document in Firestore
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    }
};

export const saveSettings = async (settings: Partial<Settings>): Promise<void> => {
    const docRef = doc(db, 'settings', 'main');
    await setDoc(docRef, settings, { merge: true });
};
