
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
import type { Product, Sale, Return, Expense, FlashSale, Settings, SaleItem, ReturnItem, Category } from './types';
import { placeholderProducts } from './placeholder-data';

// Generic Firestore interaction functions
async function getCollection<T>(collectionName: string): Promise<T[]> {
  const q = query(collection(db, collectionName));
  const querySnapshot = await getDocs(q);
  const results: T[] = [];
    querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Convert Firestore Timestamps to JS Dates
        Object.keys(data).forEach(key => {
            if (data[key] instanceof Timestamp) {
                data[key] = (data[key] as Timestamp).toDate();
            }
        });
        results.push({ id: doc.id, ...data } as T);
    });
    return results;
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
  const newDoc = await getDocumentById<T>(collectionName, docRef.id);
  return newDoc!;
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
        date: sale.date,
        items: sale.items.map((item: any) => ({
             ...item,
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
            subcategory: item.product.subcategory,
        };

        const saleItem: SaleItem = {
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
    
    const newSale = await getDocumentById<Sale>("sales", docRef.id);
    return newSale!;
}


// Expense-specific functions
export async function getExpenses(): Promise<Expense[]> {
    const expenses = await getCollection<Expense>('expenses');
    return expenses.map(e => ({...e, date: new Date(e.date) }));
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
    return getCollection<Return>('returns');
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
                    console.warn(`Product with ID ${item.productId} not found during return. Stock not updated.`);
                }
            }

            // 2. Save the new return document
            transaction.set(newReturnRef, {
                ...returnData,
                date: Timestamp.fromDate(returnData.date)
            });
        });

        const newReturn = await getDocumentById<Return>(newReturnRef.path, newReturnRef.id);
        return newReturn!;

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
    const defaultSettings: Settings = { 
        storeName: 'Toko Cepat', 
        defaultDiscount: 0, 
        syncCostPrice: true, 
        theme: 'default',
        expenseCategories: [
            { id: 'exp-cat-1', name: 'Operasional' },
            { id: 'exp-cat-2', name: 'Gaji' },
            { id: 'exp-cat-3', name: 'Pemasaran' },
            { id: 'exp-cat-4', name: 'Lainnya' },
        ]
    };

    if (docSnap.exists()) {
        const data = docSnap.data();
        // Merge with defaults to ensure new settings are present
        return { ...defaultSettings, ...data } as Settings;
    } else {
        // Create the default settings document in Firestore if it doesn't exist
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    }
};

export const saveSettings = async (settings: Partial<Settings>): Promise<void> => {
    const docRef = doc(db, 'settings', 'main');
    await setDoc(docRef, settings, { merge: true });
};
