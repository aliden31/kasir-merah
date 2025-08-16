
<<<<<<< HEAD

'use client';

import React, { useState, useEffect } from 'react';
import type { Product, UserRole, SkuMapping, ExtractedSaleItem, ExtractedSales, Expense } from '@/lib/types';
import { getProducts, saveSkuMapping, getSkuMappings, addImportedFile, hasImportedFile, addExpense, addSale } from '@/lib/data-service';
import { extractSales } from '@/ai/flows/extract-sales-flow';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Upload, FileCheck, AlertCircle, CheckCircle, Package, ArrowRight, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '../ui/scroll-area';
=======
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { extractSales } from '@/ai/flows/extract-sales-flow';
import type { ExtractedSale, ExtractedSaleItem } from '@/ai/schemas/extract-sales-schema';
import { getProducts, addProduct, hasImportedFile, addImportedFile, addExpense, getSkuMappings, saveSkuMapping, batchAddSales, getPublicSettings } from '@/lib/data-service';
import type { Product, UserRole, SaleItem, SkuMapping, PublicSettings, Sale } from '@/lib/types';
import { FileQuestion, Loader2, Wand2, CheckCircle2, AlertCircle, Sparkles, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useRouter } from 'next/navigation';
>>>>>>> 7821238 (Untuk UI import sebaiknya berikan page baru saja. Supaya lebih luas)

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

<<<<<<< HEAD
interface SalesImporterPageProps {
  onImportSuccess: () => void;
  userRole: UserRole;
  defaultDiscount: number;
}

type ImportStage = 'selectFile' | 'analyzing' | 'mapping' | 'confirming' | 'importing' | 'complete';

interface UnmappedSku {
    sku: string;
    productName: string;
    count: number;
}

const SalesImporterPage: FC<SalesImporterPageProps> = ({ onImportSuccess, userRole, defaultDiscount }) => {
    const [stage, setStage] = useState<ImportStage>('selectFile');
    const [file, setFile] = useState<File | null>(null);
    const [extractedData, setExtractedData] = useState<ExtractedSales | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [skuMappings, setSkuMappings] = useState<SkuMapping[]>([]);
    const [unmappedSkus, setUnmappedSkus] = useState<UnmappedSku[]>([]);
    const [userMappings, setUserMappings] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [productsData, mappingsData] = await Promise.all([getProducts(), getSkuMappings()]);
                setProducts(productsData);
                setSkuMappings(mappingsData);
            } catch (e) {
                toast({ title: 'Gagal Memuat Data Awal', description: 'Tidak dapat memuat produk dan pemetaan SKU.', variant: 'destructive' });
            }
        };
        fetchInitialData();
    }, [toast]);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setError(null);
        setExtractedData(null);
        setUnmappedSkus([]);
        setUserMappings({});
        setStage('selectFile');
    };

    const handleAnalyzeFile = async () => {
        if (!file) {
            setError('Silakan pilih file terlebih dahulu.');
            return;
        }

        const wasImported = await hasImportedFile(file.name);
        if (wasImported) {
            setError(`File "${file.name}" sudah pernah diimpor sebelumnya.`);
            return;
        }

        setStage('analyzing');
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const fileDataUri = reader.result as string;
                const result = await extractSales({ fileDataUri });
                setExtractedData(result);
                
                const existingMappings = new Map(skuMappings.map(m => [m.importSku, m.mappedProductId]));
                const productSkuSet = new Set(products.map(p => p.id));
                const unmapped: Record<string, { productName: string, count: number }> = {};

                result.items.forEach(item => {
                    const isMapped = existingMappings.has(item.sku) && productSkuSet.has(existingMappings.get(item.sku)!);
                    const isDirectMatch = productSkuSet.has(item.sku);

                    if (!isMapped && !isDirectMatch) {
                        if (!unmapped[item.sku]) {
                            unmapped[item.sku] = { productName: item.productName, count: 0 };
                        }
                        unmapped[item.sku].count++;
                    }
                });
                
                const unmappedList = Object.entries(unmapped).map(([sku, data]) => ({ sku, ...data }));
                setUnmappedSkus(unmappedList);

                if (unmappedList.length > 0) {
                    setStage('mapping');
                } else {
                    setStage('confirming');
                }
            };
        } catch (e) {
            console.error(e);
            setError('Gagal menganalisis file. Pastikan format file sudah benar dan coba lagi.');
            setStage('selectFile');
        }
    };
    
    const handleMappingChange = (importSku: string, productId: string) => {
        setUserMappings(prev => ({...prev, [importSku]: productId}));
    };

    const handleConfirmMappings = async () => {
        setStage('analyzing'); // Show loading state while saving mappings
        try {
            for (const importSku of Object.keys(userMappings)) {
                const mappedProductId = userMappings[importSku];
                const mappedProduct = products.find(p => p.id === mappedProductId);
                if (mappedProduct) {
                    const newMapping: Omit<SkuMapping, 'id'> = {
                        importSku,
                        mappedProductId,
                        mappedProductName: mappedProduct.name,
                    };
                    await saveSkuMapping(newMapping);
                }
            }
            // Refetch mappings
            const newMappings = await getSkuMappings();
            setSkuMappings(newMappings);
            setStage('confirming');
        } catch (e) {
            toast({ title: 'Gagal Menyimpan Pemetaan', description: 'Terjadi kesalahan saat menyimpan pemetaan SKU.', variant: 'destructive' });
            setStage('mapping');
=======
const CREATE_NEW_PRODUCT_VALUE = 'CREATE_NEW_PRODUCT';
type AnalysisState = 'idle' | 'analyzing' | 'review' | 'saving' | 'error' | 'success';
type AggregatedSaleItem = {
    sku: string;
    name: string;
    quantity: number;
    price: number;
    isNew: boolean;
};

interface SalesImporterPageProps {
    onImportComplete: () => void;
    userRole: UserRole;
}

const SalesImporterPage: React.FC<SalesImporterPageProps> = ({ onImportComplete, userRole }) => {
    const [file, setFile] = useState<File | null>(null);
    const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
    const [dbProducts, setDbProducts] = useState<Product[]>([]);
    const [dbSkuMappings, setDbSkuMappings] = useState<SkuMapping[]>([]);
    const [publicSettings, setPublicSettings] = useState<PublicSettings>({ defaultDiscount: 0 });
    const [errorMessage, setErrorMessage] = useState('');
    const { toast } = useToast();

    // Data from analysis
    const [aggregatedItems, setAggregatedItems] = useState<AggregatedSaleItem[]>([]);
    const [unrecognizedItems, setUnrecognizedItems] = useState<AggregatedSaleItem[]>([]);
    const [productMappings, setProductMappings] = useState<Record<string, string>>({});
    const [salesToCreate, setSalesToCreate] = useState<Omit<Sale, 'id' | 'displayId'>[]>([]);

    const isMappingComplete = useMemo(() => {
      return unrecognizedItems.every(item => productMappings[item.sku]);
    }, [unrecognizedItems, productMappings]);

    useEffect(() => {
        const fetchInitialData = async () => {
            const products = await getProducts();
            const mappings = await getSkuMappings();
            const settings = await getPublicSettings();
            setDbProducts(products);
            setDbSkuMappings(mappings);
            setPublicSettings(settings);
        };
        fetchInitialData();
    }, []);

    const processExtractedSales = (sales: ExtractedSale[]) => {
        const allItems = sales.flatMap(s => s.items);
        const itemsBySku = new Map<string, { totalQuantity: number; lastPrice: number; name: string }>();

        allItems.forEach(item => {
            const skuKey = (item.sku || '').trim();
            if (!skuKey) return; 

            if (!itemsBySku.has(skuKey)) {
                itemsBySku.set(skuKey, { totalQuantity: 0, lastPrice: item.price, name: item.name });
            }
            const existing = itemsBySku.get(skuKey)!;
            existing.totalQuantity += item.quantity;
            existing.lastPrice = item.price;
        });

        const finalAggregatedItems: AggregatedSaleItem[] = [];
        const finalUnrecognizedItems: AggregatedSaleItem[] = [];
        const initialMappings: Record<string, string> = {};

        for (const [skuKey, aggregatedData] of itemsBySku.entries()) {
            const { totalQuantity, lastPrice, name } = aggregatedData;
            const dbProduct = dbProducts.find(p => p.id.toLowerCase() === skuKey.toLowerCase());
            const existingMapping = dbSkuMappings.find(m => m.importSku.toLowerCase() === skuKey.toLowerCase());
            
            const isNew = !dbProduct;

            const aggregatedItem: AggregatedSaleItem = {
                sku: skuKey,
                name,
                quantity: totalQuantity,
                price: lastPrice,
                isNew,
            };

            if (isNew) {
                if (existingMapping) {
                    initialMappings[skuKey] = existingMapping.mappedProductId;
                }
                finalUnrecognizedItems.push(aggregatedItem);
            }
            
            finalAggregatedItems.push(aggregatedItem);
        }
        
        const finalSalesToCreate: Omit<Sale, 'id'>[] = sales.map(sale => {
            const subtotal = sale.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const discount = publicSettings.defaultDiscount || 0;
            const finalTotal = subtotal * (1 - discount / 100);
            return {
                items: sale.items.map(item => ({
                    ...item,
                    product: { id: '', name: item.name, category: '', costPrice: 0 },
                    costPriceAtSale: 0
                })),
                date: new Date(),
                subtotal: subtotal,
                discount: discount,
                finalTotal: finalTotal,
            };
        });

        setSalesToCreate(finalSalesToCreate);
        setProductMappings(initialMappings);
        setAggregatedItems(finalAggregatedItems.sort((a,b) => a.name.localeCompare(b.name)));
        setUnrecognizedItems(finalUnrecognizedItems);
        setAnalysisState('review');
    };


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
             setAnalysisState('idle');
             setErrorMessage('');
        }
    };
    
    const handleStructuredFileParse = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                const orders = new Map<string, ExtractedSale>();

<<<<<<< HEAD
                const items: ExtractedSaleItem[] = json
                    .map((row) => {
                        const sku = (row['SKU Gudang'] || '').toString().trim();
                        if (!sku) return null;
                        
                        const orderNumber = (row['nomer pesanan'] || '').toString().trim();
                        if(orderNumber) {
                            uniqueOrders.add(orderNumber);
                        }
                        return {
=======
                json.forEach((row, index) => {
                    const orderId = (row['Nomor Pesanan'] || `excel-row-${index}`).toString().trim();
                    const sku = (row['SKU Gudang'] || row['Nomor Referensi SKU'] || '').toString().trim();
                    if (!sku) return;

                    if (!orders.has(orderId)) {
                        orders.set(orderId, { items: [], total: 0 });
                    }

                    const order = orders.get(orderId)!;
                    const quantity = Number(row['Jumlah'] || 0);
                    const price = Number(row['Harga Satuan'] || 0);
                    
                    if (quantity > 0) {
                        order.items.push({
<<<<<<< HEAD
>>>>>>> d4f50cc (Saat impor excell. Apakah bisa di catatkan pertransaksi saja?)
                            name: (row['Nama SKU'] || sku).toString(),
=======
                            name: (row['Nama Produk'] || sku).toString(),
>>>>>>> a727393 (Anda perlu memastikan bahwa objek yang Anda simpan ke dalam state sales)
                            sku: sku,
                            quantity: quantity,
                            price: price,
                        });
                        order.total += price * quantity;
                    }
                });

                const extractedSales = Array.from(orders.values());
                if (extractedSales.length > 0) {
                    processExtractedSales(extractedSales);
                } else {
                    setErrorMessage('Format file tidak sesuai atau tidak ada data yang valid. Pastikan ada kolom "Nomor Pesanan", "SKU Gudang", "Jumlah", dan "Harga Satuan".');
                    setAnalysisState('error');
                }
            } catch (err) {
                 setErrorMessage('Gagal memproses file. Pastikan formatnya benar.');
                 setAnalysisState('error');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handlePdfImageParse = async (file: File) => {
         const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const result = await extractSales({ 
                        fileDataUri: reader.result as string,
                        products: dbProducts,
                    });
                    
                    if (result && result.sales.length > 0) {
                        processExtractedSales(result.sales); 
                    } else {
                        setErrorMessage('AI tidak dapat menemukan data penjualan di dalam file. Coba file lain atau pastikan formatnya jelas.');
                        setAnalysisState('error');
                    }
                } catch (error) {
                    console.error('Analysis failed:', error);
                    setErrorMessage('Terjadi kesalahan saat menganalisis file. Lihat konsol untuk detail.');
                    setAnalysisState('error');
                }
            };
            reader.onerror = () => {
                 setErrorMessage('Gagal membaca file. Silakan coba lagi.');
                 setAnalysisState('error');
            };
    }

    const handleAnalyze = async () => {
        if (!file) return;

        setAnalysisState('analyzing');
        setErrorMessage('');
        
        if(file.type.includes('spreadsheetml') || file.type.includes('csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
            handleStructuredFileParse(file);
        } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            await handlePdfImageParse(file);
        } else {
            setErrorMessage('Tipe file tidak didukung. Harap unggah file Excel, CSV, PDF, atau gambar.');
            setAnalysisState('error');
>>>>>>> 7821238 (Untuk UI import sebaiknya berikan page baru saja. Supaya lebih luas)
        }
    };

    const handleConfirmImport = async () => {
<<<<<<< HEAD
<<<<<<< HEAD
        if (!extractedData || !file) return;

        setStage('importing');
        const salesByOrderId: Record<string, any[]> = {};
        const allMappings = new Map([
            ...skuMappings.map(m => [m.importSku, m.mappedProductId] as [string, string]),
            ...Object.entries(userMappings),
        ]);
        
        // Group items by orderId
        extractedData.items.forEach(item => {
            if (!salesByOrderId[item.orderId]) {
                salesByOrderId[item.orderId] = [];
            }
            salesByOrderId[item.orderId].push(item);
        });

        const totalSalesToProcess = Object.keys(salesByOrderId).length;
        let processedSales = 0;

        try {
            for (const orderId in salesByOrderId) {
                const itemsInOrder = salesByOrderId[orderId];
                const saleItems: any[] = [];
                let subtotal = 0;

                for (const item of itemsInOrder) {
                    const productId = allMappings.get(item.sku) || (products.find(p => p.id === item.sku) ? item.sku : null);
                    const product = products.find(p => p.id === productId);

                    if (product) {
                         saleItems.push({
                            product: {
                                id: product.id,
                                name: product.name,
                                category: product.category,
                                subcategory: product.subcategory,
                                costPrice: product.costPrice,
                            },
                            quantity: item.quantity,
                            price: item.sellingPrice,
                            costPriceAtSale: product.costPrice,
                        });
                        subtotal += item.sellingPrice * item.quantity;
                    } else {
                        console.warn(`Skipping item with unmapped SKU: ${item.sku}`);
                    }
                }
                
                if (saleItems.length > 0) {
                     const finalTotal = subtotal * (1 - (defaultDiscount || 0) / 100);
                     const newSale = {
                        items: saleItems,
                        subtotal: subtotal,
                        discount: defaultDiscount || 0,
                        finalTotal: finalTotal,
                        date: new Date(), // Use current date for imported sales
                    };
                    await addSale(newSale, userRole);
                }

                processedSales++;
                setProgress((processedSales / totalSalesToProcess) * 100);
            }

            // Create expense for shipping labels
            const shippingExpense: Omit<Expense, 'id'> = {
                name: `Biaya Resi - ${file.name}`,
                amount: extractedData.summary.totalOrders * 1250,
                category: 'Operasional',
                subcategory: 'Pengiriman',
                date: new Date(),
            };
            await addExpense(shippingExpense, 'sistem');
            
            // Mark file as imported
            await addImportedFile(file.name);

            setStage('complete');
        } catch (e) {
            console.error(e);
            setError('Gagal mengimpor penjualan. Beberapa data mungkin sudah tersimpan. Silakan periksa riwayat penjualan.');
            setStage('confirming');
        }
    };


    const renderContent = () => {
        switch (stage) {
            case 'selectFile':
                return (
                    <Card className="text-center border-0 shadow-none">
                        <CardHeader>
                            <CardTitle>Langkah 1: Unggah File Excel</CardTitle>
                            <CardDescription>Pilih file laporan penjualan yang ingin Anda impor.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div 
                                className="border-2 border-dashed border-muted-foreground/50 rounded-lg p-10 cursor-pointer hover:bg-muted/50"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">Klik atau jatuhkan file di sini</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                                />
                            </div>
                            {file && <p className="mt-4 text-sm font-semibold text-primary">{file.name}</p>}
                            {error && <Alert variant="destructive" className="mt-4 text-left"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={handleAnalyzeFile} disabled={!file}>
                                <FileCheck className="mr-2 h-4 w-4" /> Analisis File
                            </Button>
                        </CardFooter>
                    </Card>
                );

            case 'analyzing':
                return (
                    <Card className="text-center border-0 shadow-none">
                        <CardContent className="p-10">
                            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                            <p className="mt-4 text-lg font-semibold">Menganalisis File...</p>
                            <p className="text-muted-foreground">AI sedang membaca dan memproses data penjualan Anda. Mohon tunggu sebentar.</p>
                        </CardContent>
                    </Card>
                );
            
            case 'mapping':
                return (
                     <Card className="border-0 shadow-none">
                        <CardHeader>
                            <CardTitle>Langkah 2: Pemetaan SKU</CardTitle>
                            <CardDescription>Beberapa SKU dari file Anda tidak dikenali. Silakan petakan ke produk yang ada di sistem.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU Excel</TableHead>
                                            <TableHead>Nama Produk Excel</TableHead>
                                            <TableHead>Jumlah</TableHead>
                                            <TableHead>Petakan ke Produk Sistem</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {unmappedSkus.map(item => (
                                            <TableRow key={item.sku}>
                                                <TableCell className="font-mono">{item.sku}</TableCell>
                                                <TableCell>{item.productName}</TableCell>
                                                <TableCell>{item.count}</TableCell>
                                                <TableCell>
                                                    <Select onValueChange={(value) => handleMappingChange(item.sku, value)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Pilih produk..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
=======
        if (!file) return;
=======
        if (!file || salesToCreate.length === 0) return;
>>>>>>> d4f50cc (Saat impor excell. Apakah bisa di catatkan pertransaksi saja?)
        setAnalysisState('saving');
        try {
            const fileAlreadyImported = await hasImportedFile(file.name);

            if (salesToCreate.length > 0 && !fileAlreadyImported) {
                const resiExpense = {
                    name: `Biaya Resi Marketplace - ${file.name}`,
                    amount: salesToCreate.length * 1250,
                    category: 'Operasional',
                    date: new Date(),
                    subcategory: 'Biaya Pengiriman'
                };
                await addExpense(resiExpense, 'sistem');
                await addImportedFile(file.name);
                toast({
                    title: 'Pengeluaran Pesanan Dibuat',
                    description: `Otomatis membuat pengeluaran untuk ${salesToCreate.length} pesanan sebesar ${formatCurrency(resiExpense.amount)}.`,
                });
            } else if (salesToCreate.length > 0 && fileAlreadyImported) {
                 toast({
                    title: 'Pengeluaran Dilewati',
                    description: `Pengeluaran untuk file ini sudah pernah dibuat sebelumnya.`,
                    variant: 'default',
                });
            }

            const newProductIds = new Map<string, string>();
            let updatedDbProducts = [...dbProducts];

            for (const item of unrecognizedItems) {
                const mappingValue = productMappings[item.sku];
                if (!mappingValue) continue;

                if (mappingValue === CREATE_NEW_PRODUCT_VALUE) {
                     const productData = {
                        name: item.name,
                        sellingPrice: item.price,
                        costPrice: 0,
                        stock: 0,
                        category: 'Impor',
                        id: item.sku,
                    };
                    const createdProduct = await addProduct(productData, userRole);
                    newProductIds.set(item.sku, createdProduct.id);
                    updatedDbProducts.push(createdProduct);
                } else {
                    const mappedProduct = dbProducts.find(p => p.id === mappingValue);
                    if (mappedProduct) {
                       await saveSkuMapping({
                           importSku: item.sku,
                           mappedProductId: mappedProduct.id,
                           mappedProductName: mappedProduct.name
                       });
                    }
                }
            }

            const finalSales: Omit<Sale, 'id'>[] = salesToCreate.map(sale => {
                const saleItems: SaleItem[] = sale.items.map((item: any) => {
                    let finalProductId: string | undefined;
                    let importSku = item.sku;
                    const existingProduct = dbProducts.find(p => p.id.toLowerCase() === importSku.toLowerCase());

                    if (existingProduct) {
                        finalProductId = existingProduct.id;
                    } else {
                         const mappedId = productMappings[importSku];
                        if(mappedId && mappedId !== CREATE_NEW_PRODUCT_VALUE) {
                            finalProductId = mappedId;
                        } else if (newProductIds.has(importSku)) {
                            finalProductId = newProductIds.get(importSku);
                        } else if (productMappings[importSku] === CREATE_NEW_PRODUCT_VALUE) {
                            finalProductId = importSku;
                        }
                    }

                    if (!finalProductId) return null;
                    const productInfo = updatedDbProducts.find(p => p.id === finalProductId);
                    if (!productInfo) return null;

                    return {
                        product: {
                            id: productInfo.id, name: productInfo.name, category: productInfo.category,
                            subcategory: productInfo.subcategory, costPrice: productInfo.costPrice,
                        },
                        quantity: item.quantity,
                        price: item.price,
                        costPriceAtSale: productInfo.costPrice,
                    };
                }).filter((i): i is SaleItem => !!i);
                
                const subtotal = saleItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
                const discount = publicSettings.defaultDiscount || 0;
                const finalTotal = subtotal * (1 - discount / 100);

                return {
                    items: saleItems, subtotal, discount, finalTotal, date: new Date(),
                };
            });

            await batchAddSales(finalSales, userRole);
            
            onImportComplete();
            setAnalysisState('success');
            toast({
              title: "Impor Berhasil",
              description: `${finalSales.length} transaksi baru dari file impor telah berhasil dicatat.`,
            });

        } catch (error) {
            console.error('Import failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan data.';
            toast({
                title: 'Impor Gagal',
                description: errorMessage,
                variant: 'destructive',
            });
            setAnalysisState('review');
        }
    };

    const resetState = () => {
        setFile(null);
        setAnalysisState('idle');
        setAggregatedItems([]);
        setUnrecognizedItems([]);
        setProductMappings({});
        setErrorMessage('');
        setSalesToCreate([]);
    }

    const totalQuantity = useMemo(() => aggregatedItems.reduce((sum, item) => sum + item.quantity, 0), [aggregatedItems]);
    const sortedDbProducts = useMemo(() => [...dbProducts].sort((a,b) => a.name.localeCompare(b.name)), [dbProducts]);


    if (analysisState === 'success') {
        return (
             <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Impor Berhasil!</h2>
                <p className="text-muted-foreground mb-6">
                    {salesToCreate.length} transaksi telah berhasil dicatat sebagai penjualan baru.
                </p>
                <Button onClick={resetState}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Impor File Lain
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
             <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Impor Penjualan dari File</CardTitle>
                    <CardDescription>
                        Unggah file Excel (disarankan), CSV, PDF, atau gambar (JPG, PNG). AI akan digunakan untuk PDF/gambar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center gap-4">
                        <Input id="file-upload" type="file" onChange={handleFileChange} accept=".csv,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" disabled={analysisState === 'analyzing' || analysisState === 'saving'}/>
                        <Button onClick={handleAnalyze} disabled={!file || analysisState === 'analyzing' || analysisState === 'saving'}>
                            {analysisState === 'analyzing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {file?.type.includes('spreadsheet') ? <FileSpreadsheet className="mr-2 h-4 w-4"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                            Proses File
                        </Button>
                     </div>
                      {errorMessage && (
                         <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Analisis Gagal</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {analysisState === 'analyzing' && (
                <div className="text-center py-10">
                    <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                    <h3 className="mt-4 text-lg font-medium">Memproses File...</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Harap tunggu, sistem sedang membaca dan mengekstrak data dari file Anda.</p>
                </div>
            )}
            
            {analysisState === 'review' && (
                <div className="space-y-6">
                    <Alert>
                        <Sparkles className="h-4 w-4" />
                        <AlertTitle>Hasil Analisis</AlertTitle>
                        <AlertDescription>
                            Sistem berhasil mengekstrak <span className="font-bold">{salesToCreate.length} transaksi</span> dengan total <span className="font-bold">{totalQuantity} item</span>.
                            Harap tinjau dan petakan produk yang tidak dikenali di bawah ini.
                        </AlertDescription>
                    </Alert>
                    
                    {unrecognizedItems.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center"><AlertCircle className="h-5 w-5 mr-2 text-amber-500"/>Petakan Produk Tidak Dikenali</CardTitle>
                                <CardDescription>Cocokkan SKU dari file impor dengan produk yang ada di database Anda atau buat yang baru.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-52">
                                    <div className="space-y-4 pr-4">
                                    {unrecognizedItems.map(item => (
                                        <div key={item.sku} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 items-center">
                                            <div>
                                                <p className="font-semibold">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">SKU Impor: {item.sku}</p>
                                            </div>
                                            <Select 
                                                value={productMappings[item.sku] || ''} 
                                                onValueChange={value => setProductMappings(prev => ({...prev, [item.sku]: value}))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih Aksi..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={CREATE_NEW_PRODUCT_VALUE}>
                                                        <span className="font-semibold text-primary">Buat Produk Baru (ID: {item.sku})</span>
                                                    </SelectItem>
                                                    {sortedDbProducts.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.id})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    )}


                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center"><CheckCircle2 className="h-5 w-5 mr-2 text-green-500"/>Ringkasan Impor</CardTitle>
                             <CardDescription>Ini adalah rincian item yang akan dicatat sebagai penjualan setelah konfirmasi.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-64 border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama Produk</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className="text-right">Jumlah</TableHead>
                                            <TableHead className="text-right">Harga Jual Satuan</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {aggregatedItems.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={item.isNew ? "secondary" : "default"}>{item.isNew ? "Baru" : "Dikenali"}</Badge>
>>>>>>> 7821238 (Untuk UI import sebaiknya berikan page baru saja. Supaya lebih luas)
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
<<<<<<< HEAD
                         <CardFooter>
                            <Button className="w-full" onClick={handleConfirmMappings} disabled={Object.keys(userMappings).length !== unmappedSkus.length}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Konfirmasi Pemetaan
                            </Button>
                        </CardFooter>
                    </Card>
                );

            case 'confirming':
                 if (!extractedData) return null;
                 return (
                    <Card className="border-0 shadow-none">
                        <CardHeader>
                            <CardTitle>Langkah 3: Konfirmasi Impor</CardTitle>
                            <CardDescription>Tinjau ringkasan data sebelum mengimpor ke sistem.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <Package className="h-4 w-4" />
                                <AlertTitle>Ringkasan Penjualan</AlertTitle>
                                <AlertDescription>
                                    <div className="grid grid-cols-2 gap-1 text-sm">
                                        <span>Total Pendapatan:</span> <span className="font-semibold text-right">{formatCurrency(extractedData.summary.totalRevenue)}</span>
                                        <span>Total Item Terjual:</span> <span className="font-semibold text-right">{extractedData.summary.totalItems}</span>
                                        <span>Jumlah Pesanan Unik:</span> <span className="font-semibold text-right">{extractedData.summary.totalOrders}</span>
                                    </div>
                                </AlertDescription>
                            </Alert>
                             <Alert variant="destructive">
                                <HelpCircle className="h-4 w-4" />
                                <AlertTitle>Pencatatan Biaya Otomatis</AlertTitle>
                                <AlertDescription>
                                    Sistem akan secara otomatis mencatat pengeluaran untuk biaya resi sebesar <span className="font-semibold">{formatCurrency(extractedData.summary.totalOrders * 1250)}</span> ({extractedData.summary.totalOrders} pesanan x {formatCurrency(1250)}).
                                </AlertDescription>
                            </Alert>
                             <p className="text-xs text-muted-foreground text-center">Dengan melanjutkan, penjualan akan dicatat dan stok produk akan diperbarui. Tindakan ini tidak dapat diurungkan.</p>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={handleConfirmImport}>
                                 Konfirmasi & Impor Penjualan
                            </Button>
                        </CardFooter>
                    </Card>
                );

            case 'importing':
                return (
                     <Card className="text-center border-0 shadow-none">
                        <CardContent className="p-10">
                            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                            <p className="mt-4 text-lg font-semibold">Mengimpor Data...</p>
                            <p className="text-muted-foreground">Mohon tunggu, proses impor sedang berjalan.</p>
                            <Progress value={progress} className="mt-4" />
                            <p className="text-xs text-muted-foreground mt-2">{Math.round(progress)}%</p>
                        </CardContent>
                    </Card>
                );

            case 'complete':
                return (
                    <ScrollArea className="max-h-[80vh]">
                     <Card className="text-center border-0 shadow-none">
                         <CardHeader>
                            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                            <CardTitle>Impor Selesai</CardTitle>
                            <CardDescription>Semua data penjualan dari file <span className="font-semibold">{file?.name}</span> telah berhasil diimpor.</CardDescription>
                         </CardHeader>
                        <CardContent>
                             <Alert>
                                <Package className="h-4 w-4" />
                                <AlertTitle>Ringkasan Hasil</AlertTitle>
                                <AlertDescription>
                                     <div className="grid grid-cols-2 gap-1 text-sm">
                                        <span>Total Pendapatan:</span> <span className="font-semibold text-right">{formatCurrency(extractedData?.summary.totalRevenue || 0)}</span>
                                        <span>Pesanan Diproses:</span> <span className="font-semibold text-right">{extractedData?.summary.totalOrders || 0}</span>
                                        <span>Biaya Resi Dicatat:</span> <span className="font-semibold text-right">{formatCurrency((extractedData?.summary.totalOrders || 0) * 1250)}</span>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                             <Button className="w-full" onClick={onImportSuccess}>Selesai</Button>
                             <Button variant="outline" className="w-full" onClick={() => handleFileSelect(file!)}>Impor Ulang File</Button>
                        </CardFooter>
                    </Card>
                    </ScrollArea>
                );
        }
    };
    
    const dialogTitle: Record<ImportStage, string> = {
        selectFile: 'Impor Penjualan dari Excel',
        analyzing: 'Menganalisis File',
        mapping: 'Pemetaan SKU Produk',
        confirming: 'Konfirmasi Impor',
        importing: 'Sedang Mengimpor',
        complete: 'Impor Selesai',
    };


    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{dialogTitle[stage]}</DialogTitle>
            </DialogHeader>
           {renderContent()}
        </DialogContent>
    );
};
=======
                    </Card>

                     <div className="flex justify-end gap-4 mt-6">
                        <Button variant="outline" onClick={resetState} disabled={analysisState === 'saving'}>Mulai Ulang</Button>
                        <Button onClick={handleConfirmImport} disabled={analysisState === 'saving' || !isMappingComplete}>
                            {analysisState === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Konfirmasi & Catat Penjualan
                        </Button>
                    </div>

                </div>
            )}
        </div>
    );
}
>>>>>>> 7821238 (Untuk UI import sebaiknya berikan page baru saja. Supaya lebih luas)

export default SalesImporterPage;



    
