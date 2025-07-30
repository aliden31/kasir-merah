

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
  DocumentReference,
  DocumentData,
} from 'firebase/firestore';
import type { Product, Sale, Return, Expense, FlashSale, Settings, SaleItem, ReturnItem, Category, SubCategory, StockOpnameLog } from './types';
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
    const dataWithTimestamp: { [key: string]: any } = { ...data };
    Object.keys(dataWithTimestamp).forEach(key => {
        if (dataWithTimestamp[key] instanceof Date) {
            dataWithTimestamp[key] = Timestamp.fromDate(dataWithTimestamp[key]);
        }
    });

  const docRef = await addDoc(collection(db, collectionName), dataWithTimestamp);
  const newDoc = await getDocumentById<T>(collectionName, docRef.id);
  if (!newDoc) {
    throw new Error("Failed to retrieve the new document.");
  }
  return newDoc;
}

async function updateDocument<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, data as any);
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
export const getSales = async (): Promise<Sale[]> => {
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

export const getSaleById = (id: string) => getDocumentById<Sale>('sales', id);

export const addSale = async (sale: Omit<Sale, 'id'>, settings: Settings): Promise<Sale> => {
    // 1. First, read all the necessary product documents outside the transaction.
    const productRefs = sale.items.map(item => doc(db, 'products', item.product.id));
    const productDocs = await Promise.all(productRefs.map(ref => getDoc(ref)));

    const productsData: Record<string, Product> = {};
    for (const doc of productDocs) {
        if (doc.exists()) {
            productsData[doc.id] = { id: doc.id, ...doc.data() } as Product;
        } else {
            throw new Error(`Product with ID ${doc.id} not found.`);
        }
    }

    // 2. Now, run the transaction with only write operations.
    return runTransaction(db, async (transaction) => {
        const saleDataForFirestore = {
            ...sale,
            items: sale.items.map(item => ({
                product: item.product,
                quantity: item.quantity,
                price: item.price,
                costPriceAtSale: item.product.costPrice,
            })),
            date: Timestamp.fromDate(sale.date)
        };
        
        // Remove displayId before saving
        if ('displayId' in saleDataForFirestore) {
            delete (saleDataForFirestore as Partial<Sale>).displayId;
        }

        const saleRef = doc(collection(db, "sales"));
        transaction.set(saleRef, saleDataForFirestore);

        for (const item of sale.items) {
            const productRef = doc(db, "products", item.product.id);
            const productData = productsData[item.product.id];
            if (!productData) {
                 throw new Error(`Product with ID ${item.product.id} not found during transaction.`);
            }
            const newStock = productData.stock - item.quantity;
            transaction.update(productRef, { stock: newStock });
        }
        
        return { ...sale, id: saleRef.id };
    });
}


export const updateSale = async (originalSale: Sale, updatedSale: Sale): Promise<void> => {
    return runTransaction(db, async (transaction) => {
        const saleRef = doc(db, "sales", originalSale.id);

        // 1. Calculate stock differences
        const stockChanges: Record<string, number> = {};

        // Original items
        originalSale.items.forEach(item => {
            stockChanges[item.product.id] = (stockChanges[item.product.id] || 0) + item.quantity;
        });

        // Updated items
        updatedSale.items.forEach(item => {
            stockChanges[item.product.id] = (stockChanges[item.product.id] || 0) - item.quantity;
        });

        // 2. Update product stocks
        for (const productId in stockChanges) {
            const change = stockChanges[productId];
            if (change !== 0) {
                const productRef = doc(db, "products", productId);
                const productDoc = await transaction.get(productRef);
                if (!productDoc.exists()) {
                    // This could happen if a product was deleted after the sale
                    console.warn(`Product with ID ${productId} not found during sale update. Stock not updated.`);
                    continue;
                }
                const newStock = productDoc.data().stock + change;
                transaction.update(productRef, { stock: newStock });
            }
        }
        
        // 3. Update the sale document
        const { id, displayId, ...saleDataToUpdate } = updatedSale;
        
        transaction.update(saleRef, {
            ...saleDataToUpdate,
            date: Timestamp.fromDate(updatedSale.date)
        });
    });
}


// Expense-specific functions
export async function getExpenses(): Promise<Expense[]> {
    const expenses = await getCollection<Expense>('expenses');
    return expenses.map(e => ({...e, date: new Date(e.date) }));
}

export const addExpense = (expense: Omit<Expense, 'id'>) => {
    return addDocument<Expense>('expenses', expense);
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

        const newReturnDoc = await getDoc(newReturnRef);
        const newReturnData = newReturnDoc.data();
        Object.keys(newReturnData!).forEach(key => {
            if (newReturnData![key] instanceof Timestamp) {
                newReturnData![key] = newReturnData![key].toDate();
            }
        });
        return { id: newReturnDoc.id, ...newReturnData } as Return;

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
            { id: 'exp-cat-1', name: 'Operasional', subcategories: [
                {id: 'exp-sub-1', name: 'Listrik & Air'},
                {id: 'exp-sub-2', name: 'Internet'},
            ] },
            { id: 'exp-cat-2', name: 'Gaji', subcategories: [] },
            { id: 'exp-cat-3', name: 'Pemasaran', subcategories: [] },
            { id: 'exp-cat-4', name: 'Lainnya', subcategories: [] },
        ]
    };

    if (docSnap.exists()) {
        const data = docSnap.data();
        // Merge with defaults to ensure new settings are present
        const settings = { ...defaultSettings, ...data } as Settings;
        // Ensure subcategories array exists for each category
        if(settings.expenseCategories) {
            settings.expenseCategories.forEach(cat => {
                if (!cat.subcategories) {
                    cat.subcategories = [];
                }
            });
        }
        return settings;
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


// Stock Opname specific functions
export const getStockOpnameLogs = () => getCollection<StockOpnameLog>('stockOpnameLogs');

export const addStockOpnameLog = async (
    product: Product,
    newStock: number,
    notes: string,
): Promise<void> => {
    const logData: Omit<StockOpnameLog, 'id'> = {
        productId: product.id,
        productName: product.name,
        previousStock: product.stock,
        newStock: newStock,
        date: new Date(),
        notes,
    };
    await addDocument<StockOpnameLog>('stockOpnameLogs', logData);
};

export const batchUpdateStockToZero = async (products: Product[]): Promise<void> => {
    const batch = writeBatch(db);

    for (const product of products) {
        // Update product stock
        const productRef = doc(db, "products", product.id);
        batch.update(productRef, { stock: 0 });

        // Create log entry
        const logData: Omit<StockOpnameLog, 'id'> = {
            productId: product.id,
            productName: product.name,
            previousStock: product.stock,
            newStock: 0,
            date: new Date(),
            notes: "Diatur ke 0 secara massal",
        };
        const logRef = doc(collection(db, 'stockOpnameLogs'));
        batch.set(logRef, { ...logData, date: Timestamp.fromDate(logData.date) });
    }
    
    await batch.commit();
}


// Danger Zone functions
type DataType = 'products' | 'sales' | 'returns' | 'expenses';

export const clearData = async (dataToClear: Record<DataType, boolean>): Promise<void> => {
    const collectionsToDelete = Object.entries(dataToClear)
        .filter(([, shouldDelete]) => shouldDelete)
        .map(([collectionName]) => collectionName);

    if (collectionsToDelete.length === 0) {
        return;
    }

    const batch = writeBatch(db);

    for (const collectionName of collectionsToDelete) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
    }

    await batch.commit();
};


    