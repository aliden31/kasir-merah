
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
  runTransaction,
} from 'firebase/firestore';
import type { Product, Sale, Return, Expense, FlashSale, Settings, SaleItem, ReturnItem } from './types';
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
        const data = docSnap.data();
        // Convert Firestore Timestamps to JS Dates
        Object.keys(data).forEach(key => {
            if (data[key] instanceof Timestamp) {
                data[key] = data[key].toDate();
            }
        });
        return { id: docSnap.id, ...data } as T;
    }
    return undefined;
}


async function addDocument<T>(collectionName: string, data: Omit<T, 'id'>): Promise<T> {
    const dataWithTimestamp = { ...data };
    Object.keys(dataWithTimestamp).forEach(key => {
        if (dataWithTimestamp[key as keyof typeof dataWithTimestamp] instanceof Date) {
            dataWithTimestamp[key as keyof typeof dataWithTimestamp] = Timestamp.fromDate(dataWithTimestamp[key as keyof typeof dataWithTimestamp] as Date) as any;
        }
    });

  const docRef = await addDoc(collection(db, collectionName), dataWithTimestamp);
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
        items: sale.items.map((item: any) => ({
             ...item,
             // Ensure product is a proper object, not a reference
             product: item.product || { id: 'unknown', name: 'Produk Dihapus', costPrice: 0, sellingPrice: 0, stock: 0, category: 'Lainnya' }
        }))
    }));
}

export const addSale = async (sale: Omit<Sale, 'id'>, settings: Settings): Promise<Sale> => {
    const itemsForFirestore = sale.items.map(item => {
        // Ensure the full product data is embedded, not just a reference
        const fullProduct: Product = {
            id: item.product.id,
            name: item.product.name,
            costPrice: item.product.costPrice,
            sellingPrice: item.product.sellingPrice,
            stock: item.product.stock,
            category: item.product.category,
        };

        const saleItem: Omit<SaleItem, 'product'> & { product: Product } = {
            product: fullProduct, // Store the entire product object snapshot
            quantity: item.quantity,
            price: item.price, // This is the selling price before discount
            costPriceAtSale: item.product.costPrice, // Always record cost price for historical profit calculation
        };
        return saleItem;
    });

    const saleDataForFirestore = {
        ...sale,
        items: itemsForFirestore,
        date: Timestamp.fromDate(sale.date)
    };

    const docRef = await addDoc(collection(db, "sales"), saleDataForFirestore);

    const batch = writeBatch(db);
    sale.items.forEach(item => {
        const productRef = doc(db, "products", item.product.id);
        const newStock = item.product.stock - item.quantity;
        batch.update(productRef, { stock: newStock });
    });
    await batch.commit();
    
    // Construct the full Sale object to return
    const newSale: Sale = { 
        id: docRef.id, 
        ...sale,
        // The items in the returned object should match what was saved
        items: itemsForFirestore as SaleItem[] 
    };
    return newSale;
}


// Expense-specific functions
export async function getExpenses(): Promise<Expense[]> {
    const expensesData = await getCollection<any>('expenses');
    return expensesData.map(expense => ({
        ...expense,
        date: (expense.date as Timestamp).toDate(),
    }));
}

export const addExpense = (expense: Omit<Expense, 'id' | 'date'> & { date?: Date }) => {
    const newExpense = {
        ...expense,
        date: expense.date || new Date(),
    }
    return addDocument<Expense>('expenses', newExpense);
};

// Return-specific functions
export async function getReturns(): Promise<Return[]> {
    const returnsData = await getCollection<any>('returns');
    return returnsData.map(r => ({
        ...r,
        date: (r.date as Timestamp).toDate(),
    }));
}

export const addReturn = async (returnData: Omit<Return, 'id'>): Promise<Return> => {
    try {
        const newReturnRef = doc(collection(db, 'returns'));
        
        await runTransaction(db, async (transaction) => {
            // 1. Update stock for each returned item
            for (const item of returnData.items) {
                const productRef = doc(db, "products", item.productId);
                const productDoc = await transaction.get(productRef);
                if (productDoc.exists()) {
                    const currentStock = productDoc.data().stock || 0;
                    const newStock = currentStock + item.quantity;
                    transaction.update(productRef, { stock: newStock });
                } else {
                    // This case should ideally not happen if products are not hard-deleted
                    console.warn(`Product with ID ${item.productId} not found during return. Stock not updated.`);
                }
            }

            // 2. Save the new return document
            transaction.set(newReturnRef, {
                ...returnData,
                date: Timestamp.fromDate(returnData.date)
            });
        });

        const newReturnWithId: Return = { ...returnData, id: newReturnRef.id };
        return newReturnWithId;

    } catch (e) {
        console.error("Return transaction failed: ", e);
        throw new Error("Gagal memproses retur. Silakan coba lagi.");
    }
};


// FlashSale-specific functions
export const getFlashSaleSettings = async (): Promise<FlashSale> => {
    const docRef = doc(db, 'settings', 'flashSale');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure products is always an array
        return { id: 'main', ...data, products: data.products || [] } as FlashSale;
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
    const defaultSettings: Settings = { storeName: 'Toko Cepat', defaultDiscount: 0, syncCostPrice: true, theme: 'default' };

    if (docSnap.exists()) {
        // Merge with defaults to ensure new settings are present
        return { ...defaultSettings, ...docSnap.data() } as Settings;
    } else {
        // Return default settings if not found
        // Optionally, create the default settings document in Firestore
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    }
};

export const saveSettings = async (settings: Partial<Settings>): Promise<void> => {
    const docRef = doc(db, 'settings', 'main');
    await setDoc(docRef, settings, { merge: true });
};
