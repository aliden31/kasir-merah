

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
import type { Product, Sale, Return, Expense, FlashSale, Settings, SaleItem, ReturnItem, Category, SubCategory, StockOpnameLog, UserRole, ActivityLog } from './types';
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

// Activity Log Functions
export const getActivityLogs = () => getCollection<ActivityLog>('activityLogs');
export const addActivityLog = (user: UserRole, description: string) => {
    const log: Omit<ActivityLog, 'id'> = {
        date: new Date(),
        user,
        description,
    };
    return addDocument<ActivityLog>('activityLogs', log);
};


// Product-specific functions
export const getProducts = () => getCollection<Product>('products');
export const getProductById = (id: string) => getDocumentById<Product>('products', id);

export const addProduct = async (product: Omit<Product, 'id'>, user: UserRole) => {
    const newProduct = await addDocument<Product>('products', product);
    await addActivityLog(user, `menambahkan produk baru: "${newProduct.name}"`);
    return newProduct;
};

export const updateProduct = async (id: string, product: Partial<Product>, user: UserRole) => {
    const originalProduct = await getProductById(id);
    if (originalProduct) {
        await updateDocument<Product>('products', id, product);
        await addActivityLog(user, `memperbarui produk: "${originalProduct.name}"`);
    }
};

export const deleteProduct = async (id: string, user: UserRole) => {
    const product = await getProductById(id);
    if (product) {
        await deleteDocument('products', id);
        await addActivityLog(user, `menghapus produk: "${product.name}"`);
    }
};

export const addPlaceholderProducts = async () => {
    const batch = writeBatch(db);
    const productsCollection = collection(db, 'products');
    
    placeholderProducts.forEach(product => {
        const docRef = doc(productsCollection); 
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

export const addSale = async (sale: Omit<Sale, 'id'>, user: UserRole): Promise<Sale> => {
    const productRefs = sale.items.map(item => doc(db, 'products', item.product.id));
    
    let newSaleId = '';
    const newSale = await runTransaction(db, async (transaction) => {
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
        const productsData: Record<string, Product> = {};
        for (const docSnap of productDocs) {
            if (docSnap.exists()) {
                productsData[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as Product;
            } else {
                // Find which product name is missing
                const missingProductId = docSnap.ref.id;
                const missingItem = sale.items.find(i => i.product.id === missingProductId);
                throw new Error(`Produk "${missingItem?.product.name || missingProductId}" tidak ditemukan.`);
            }
        }

        const saleDataForFirestore = {
            ...sale,
            items: sale.items.map(item => ({
                product: {
                    id: item.product.id,
                    name: item.product.name,
                    category: item.product.category,
                    subcategory: item.product.subcategory || '',
                },
                quantity: item.quantity,
                price: item.price,
                costPriceAtSale: productsData[item.product.id].costPrice,
            })),
            date: Timestamp.fromDate(sale.date)
        };
        
        if ('displayId' in saleDataForFirestore) {
            delete (saleDataForFirestore as Partial<Sale>).displayId;
        }

        const saleRef = doc(collection(db, "sales"));
        newSaleId = saleRef.id;
        transaction.set(saleRef, saleDataForFirestore);

        for (const item of sale.items) {
            const productRef = doc(db, "products", item.product.id);
            const productData = productsData[item.product.id];
            const newStock = productData.stock - item.quantity;
            transaction.update(productRef, { stock: newStock });
        }
        
        return { ...sale, id: saleRef.id };
    });

    await addActivityLog(user, `mencatat penjualan baru (ID: ...${newSaleId.slice(-6)}) dengan total ${formatCurrency(sale.finalTotal)}`);
    return newSale;
}


export const updateSale = async (originalSale: Sale, updatedSaleData: Sale, user: UserRole): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const stockChanges: Record<string, number> = {};
        const allProductIds = new Set<string>();

        originalSale.items.forEach(item => {
            stockChanges[item.product.id] = (stockChanges[item.product.id] || 0) + item.quantity;
            allProductIds.add(item.product.id);
        });

        updatedSaleData.items.forEach(item => {
            stockChanges[item.product.id] = (stockChanges[item.product.id] || 0) - item.quantity;
            allProductIds.add(item.product.id);
        });

        for (const productId in stockChanges) {
            if (stockChanges[productId] === 0) continue;
            
            const productRef = doc(db, "products", productId);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists()) {
                 console.warn(`Product with ID ${productId} not found during sale update. Stock not updated.`);
                continue;
            }
            const productData = productDoc.data() as Product;
            const newStock = productData.stock + stockChanges[productId];
            transaction.update(productRef, { stock: newStock });
        }

        const { id, displayId, ...saleDataForUpdate } = updatedSaleData;
        const cleanedItems = saleDataForUpdate.items.map(item => ({
            product: {
                id: item.product.id,
                name: item.product.name,
                category: item.product.category,
                subcategory: item.product.subcategory || '',
            },
            quantity: item.quantity,
            price: item.price,
            costPriceAtSale: item.costPriceAtSale,
        }));
        
        const saleRef = doc(db, "sales", originalSale.id);
        transaction.update(saleRef, {
            ...saleDataForUpdate,
            items: cleanedItems,
            date: Timestamp.fromDate(new Date(updatedSaleData.date)),
        });
    });
     await addActivityLog(user, `memperbarui penjualan (ID: ...${originalSale.id.slice(-6)})`);
};


// Expense-specific functions
export async function getExpenses(): Promise<Expense[]> {
    const expenses = await getCollection<Expense>('expenses');
    return expenses.map(e => ({...e, date: new Date(e.date) }));
}

export const addExpense = async (expense: Omit<Expense, 'id'>, user: UserRole) => {
    const newExpenseData = {
        ...expense,
        name: `${expense.category}${expense.subcategory ? ` - ${expense.subcategory}` : ''}`
    }
    const newExpense = await addDocument<Expense>('expenses', newExpenseData);
    await addActivityLog(user, `mencatat pengeluaran: "${newExpense.name}" sebesar ${formatCurrency(newExpense.amount)}`);
    return newExpense;
};

// Return-specific functions
export async function getReturns(): Promise<Return[]> {
    return getCollection<Return>('returns');
}

export const addReturn = async (returnData: Omit<Return, 'id'>, user: UserRole): Promise<Return> => {
    let newReturn: Return | null = null;
    try {
        const newReturnRef = doc(collection(db, 'returns'));
        
        await runTransaction(db, async (transaction) => {
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

            transaction.set(newReturnRef, {
                ...returnData,
                date: Timestamp.fromDate(returnData.date)
            });
        });

        const newReturnDoc = await getDoc(newReturnRef);
        if (!newReturnDoc.exists()) {
            throw new Error("Failed to create the return document.");
        }

        const newReturnData = newReturnDoc.data();
        Object.keys(newReturnData!).forEach(key => {
            if (newReturnData![key] instanceof Timestamp) {
                newReturnData![key] = newReturnData![key].toDate();
            }
        });
        newReturn = { id: newReturnDoc.id, ...newReturnData } as Return;
        await addActivityLog(user, `mencatat retur dari penjualan (ID: ...${newReturn.saleId.slice(-6)})`);
        return newReturn;

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
        return { id: 'main', ...data, products: data.products || [] } as FlashSale;
    } else {
        const defaultSettings: FlashSale = { id: 'main', title: 'Flash Sale', isActive: false, products: [] };
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    }
};

export const saveFlashSaleSettings = async (settings: FlashSale, user: UserRole): Promise<void> => {
    const { id, ...settingsData } = settings;
    const docRef = doc(db, 'settings', 'flashSale');
    await setDoc(docRef, settingsData, { merge: true });
    await addActivityLog(user, `memperbarui pengaturan Flash Sale. Status: ${settings.isActive ? 'Aktif' : 'Nonaktif'}`);
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
        const settings = { ...defaultSettings, ...data } as Settings;
        if(settings.expenseCategories) {
            settings.expenseCategories.forEach(cat => {
                if (!cat.subcategories) {
                    cat.subcategories = [];
                }
            });
        }
        return settings;
    } else {
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    }
};

export const saveSettings = async (settings: Partial<Settings>, user: UserRole): Promise<void> => {
    const docRef = doc(db, 'settings', 'main');
    await setDoc(docRef, settings, { merge: true });
     await addActivityLog(user, `memperbarui pengaturan umum toko.`);
};


// Stock Opname specific functions
export const getStockOpnameLogs = () => getCollection<StockOpnameLog>('stockOpnameLogs');

export const addStockOpnameLog = async (
    product: Product,
    newStock: number,
    notes: string,
    user: UserRole,
): Promise<void> => {
    const logData: Omit<StockOpnameLog, 'id'> = {
        productId: product.id,
        productName: product.name,
        previousStock: product.stock,
        newStock: newStock,
        date: new Date(),
        notes,
        user,
    };
    await addDocument<StockOpnameLog>('stockOpnameLogs', logData);
    await addActivityLog(user, `melakukan stok opname untuk "${product.name}". Stok berubah dari ${product.stock} menjadi ${newStock}.`);
};

export const batchUpdateStockToZero = async (products: Product[], user: UserRole): Promise<void> => {
    await runTransaction(db, async (transaction) => {
      const logCollectionRef = collection(db, 'stockOpnameLogs');
      for (const product of products) {
        const productRef = doc(db, "products", product.id);
        transaction.update(productRef, { stock: 0 });
  
        const logData: Omit<StockOpnameLog, 'id'> = {
          productId: product.id,
          productName: product.name,
          previousStock: product.stock,
          newStock: 0,
          date: new Date(),
          notes: "Diatur ke 0 secara massal",
          user: user,
        };
  
        const logDocRef = doc(logCollectionRef);
        transaction.set(logDocRef, { ...logData, date: Timestamp.fromDate(logData.date) });
      }
    });
     await addActivityLog(user, `mengatur stok 0 untuk ${products.length} produk secara massal.`);
  };


// Danger Zone functions
type DataType = 'products' | 'sales' | 'returns' | 'expenses';

export const clearData = async (dataToClear: Record<DataType, boolean>, user: UserRole): Promise<void> => {
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
    await addActivityLog(user, `menghapus data: ${collectionsToDelete.join(', ')}.`);
};

// Helper
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};
