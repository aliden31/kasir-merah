

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { extractSales } from '@/ai/flows/extract-sales-flow';
import type { ExtractedSaleItem } from '@/ai/schemas/extract-sales-schema';
import { getProducts, addProduct, hasImportedFile, addImportedFile, addExpense } from '@/lib/data-service';
import type { Product, UserRole, SaleItem } from '@/lib/types';
import { FileQuestion, Loader2, Wand2, CheckCircle2, AlertCircle, Sparkles, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

const CREATE_NEW_PRODUCT_VALUE = 'CREATE_NEW_PRODUCT';
type AnalysisState = 'idle' | 'analyzing' | 'review' | 'saving' | 'error';
type AggregatedSaleItem = {
    sku: string;
    name: string;
    quantity: number;
    price: number;
    costPrice: number;
    isNew: boolean;
};

interface SalesImporterProps {
    onImportComplete: (items: SaleItem[]) => void;
    userRole: UserRole;
}

export const SalesImporter: React.FC<SalesImporterProps> = ({ onImportComplete, userRole }) => {
    const [file, setFile] = useState<File | null>(null);
    const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
    const [dbProducts, setDbProducts] = useState<Product[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const { toast } = useToast();

    // State to hold the final, processed data for review
    const [aggregatedItems, setAggregatedItems] = useState<AggregatedSaleItem[]>([]);
    const [unrecognizedItems, setUnrecognizedItems] = useState<AggregatedSaleItem[]>([]);
    const [matchedProducts, setMatchedProducts] = useState<Map<string, Product>>(new Map());
    const [productMappings, setProductMappings] = useState<Record<string, string>>({}); // { unrecognizedSku: 'existingProductId' or 'CREATE_NEW' }
    const [uniqueOrderCount, setUniqueOrderCount] = useState(0);
    const [resiCount, setResiCount] = useState(0);

    const isMappingComplete = useMemo(() => {
      return unrecognizedItems.every(item => productMappings[item.sku]);
    }, [unrecognizedItems, productMappings]);

    useEffect(() => {
        const fetchDbProducts = async () => {
            const products = await getProducts();
            setDbProducts(products);
        };
        fetchDbProducts();
    }, []);

<<<<<<< HEAD
    const handleCostPriceChange = (sku: string, value: string) => {
        const newCostPrice = value === '' ? 0 : parseInt(value, 10);
        if (isNaN(newCostPrice)) return;

        setAggregatedItems(prevItems =>
            prevItems.map(item =>
                item.sku === sku ? { ...item, costPrice: newCostPrice } : item
            )
        );
    };

    const processExtractedItems = (items: ExtractedSaleItem[], uniqueOrderCountValue: number = 0) => {
=======
    const processExtractedItems = (items: ExtractedSaleItem[], uniqueOrderCountValue: number = 0, uniqueResiCount: number = 0) => {
>>>>>>> d78c6df (Saat impor data excell. Jumlah transaksi atau nomer resi masukan kedalam)
        const itemsBySku = new Map<string, { totalQuantity: number; totalValue: number; name: string; originalItems: ExtractedSaleItem[] }>();
        setUniqueOrderCount(uniqueOrderCountValue);
        setResiCount(uniqueResiCount);

        // 1. Group items and aggregate quantities and values
        items.forEach(item => {
            const skuKey = item.sku; // Use SKU as the primary key
            if (!skuKey) return; // Ignore items without SKU

            if (!itemsBySku.has(skuKey)) {
                itemsBySku.set(skuKey, { totalQuantity: 0, totalValue: 0, name: item.name, originalItems: [] });
            }
            const existing = itemsBySku.get(skuKey)!;
            existing.totalQuantity += item.quantity;
            existing.totalValue += item.price * item.quantity;
            existing.originalItems.push(item);
        });

        // 2. Calculate final aggregated list and identify new/matched products
        const finalAggregatedItems: AggregatedSaleItem[] = [];
        const finalUnrecognizedItems: AggregatedSaleItem[] = [];
        const finalMatchedProducts = new Map<string, Product>();

        for (const [skuKey, aggregatedData] of itemsBySku.entries()) {
            const { totalQuantity, totalValue, name } = aggregatedData;
            const averagePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
            const dbProduct = dbProducts.find(p => p.id.toLowerCase() === skuKey.toLowerCase());
            const isNew = !dbProduct;

            const aggregatedItem: AggregatedSaleItem = {
                sku: skuKey,
                name,
                quantity: totalQuantity,
                price: averagePrice,
                costPrice: dbProduct ? dbProduct.costPrice : 0,
                isNew,
            };

            if (isNew) {
                finalUnrecognizedItems.push(aggregatedItem);
            } else {
                finalMatchedProducts.set(skuKey, dbProduct);
            }
            
            finalAggregatedItems.push(aggregatedItem);
        }
        
        // 3. Set the state
        setAggregatedItems(finalAggregatedItems.sort((a,b) => a.name.localeCompare(b.name)));
        setUnrecognizedItems(finalUnrecognizedItems);
        setMatchedProducts(finalMatchedProducts);
        setAnalysisState('review');
    };


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
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

                const uniqueResi = new Set<string>();

<<<<<<< HEAD
                const items: ExtractedSaleItem[] = json.map((row) => {
                    const providedSku = (row['SKU Gudang'] || row['SKU'] || '').toString().trim();
                    const productName = (row['Nama Produk'] || '').toString().trim();
                    const sku = providedSku || productName;
                    const name = (row['Nama SKU'] || productName || sku).toString().trim();
                    const resiNumber = (row['Nomor Resi'] || '').toString().trim();
                    if(resiNumber) {
                        uniqueResi.add(resiNumber);
                    }
                    return {
                        name: name,
                        sku: sku,
                        quantity: Number(row['Jumlah'] || 0),
                        price: Number(row['Harga Satuan'] || 0),
                    };
                }).filter(item => item.sku && item.quantity > 0);
=======
                const items: ExtractedSaleItem[] = json
                    .map((row) => {
                        const sku = (row['SKU Gudang'] || '').toString().trim();
                        if (!sku) return null; // Skip rows with empty SKU
                        
                        const resiNumber = (row['Nomor Resi'] || '').toString().trim();
                        if(resiNumber) {
                            uniqueResi.add(resiNumber);
                        }
                        return {
                            name: (row['Nama SKU'] || sku).toString(),
                            sku: sku,
                            quantity: Number(row['Jumlah'] || 0),
                            price: Number(row['Harga Satuan'] || 0),
                        };
                    })
                    .filter((item): item is ExtractedSaleItem => item !== null && item.quantity > 0);

>>>>>>> d78c6df (Saat impor data excell. Jumlah transaksi atau nomer resi masukan kedalam)

                if (items.length > 0) {
                    processExtractedItems(items, uniqueResi.size, uniqueResi.size);
                } else {
<<<<<<< HEAD
<<<<<<< HEAD
                    setErrorMessage('Format file tidak sesuai atau tidak ada data yang valid. Pastikan ada kolom "SKU Gudang"/"SKU"/"Nama Produk", "Jumlah", dan "Harga Satuan".');
=======
                    setErrorMessage('Format file tidak sesuai atau tidak ada data yang valid. Pastikan ada kolom "SKU Gudang" atau "SKU" dan "Jumlah".');
>>>>>>> d78c6df (Saat impor data excell. Jumlah transaksi atau nomer resi masukan kedalam)
=======
                    setErrorMessage('Format file tidak sesuai atau tidak ada data yang valid. Pastikan ada kolom "SKU Gudang".');
>>>>>>> 62398f3 (Saat inpor data excell. Alialih membuat prodak baru. Lebih baik berikan)
                    setAnalysisState('error');
                }
            } catch (err) {
                 setErrorMessage('Gagal memproses file. Pastikan formatnya benar.');
                 setAnalysisState('error');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handlePdfImageParse = (file: File) => {
         const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const fileDataUri = reader.result as string;
                    const existingProducts = dbProducts.map(p => ({ id: p.id, name: p.name }));
                    const result = await extractSales({ fileDataUri, products: existingProducts });
                    
                    if (result && result.sales.length > 0) {
                        const allItems = result.sales.flatMap(s => s.items);
                        processExtractedItems(allItems, result.sales.length, 0); 
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
            handlePdfImageParse(file);
        } else {
            setErrorMessage('Tipe file tidak didukung. Harap unggah file Excel, CSV, PDF, atau gambar.');
            setAnalysisState('error');
        }
    };

    const handleConfirmImport = async () => {
        if (!file) return;
        setAnalysisState('saving');
        try {
            const fileAlreadyImported = await hasImportedFile(file.name);

            if (resiCount > 0 && !fileAlreadyImported) {
                const resiExpense = {
                    name: `Biaya Resi Marketplace - ${file.name}`,
                    amount: resiCount * 1250,
                    category: 'Operasional',
                    date: new Date(),
                    subcategory: 'Biaya Pengiriman'
                };
                await addExpense(resiExpense, 'sistem');
                await addImportedFile(file.name);
                toast({
                    title: 'Pengeluaran Resi Dibuat',
                    description: `Otomatis membuat pengeluaran untuk ${resiCount} resi sebesar ${formatCurrency(resiExpense.amount)}.`,
                });
            } else if (resiCount > 0 && fileAlreadyImported) {
                 toast({
                    title: 'Pengeluaran Dilewati',
                    description: `Pengeluaran untuk file ini sudah pernah dibuat sebelumnya.`,
                    variant: 'default',
                });
            }

            const newProductIds = new Map<string, string>();
            let updatedDbProducts = [...dbProducts];

<<<<<<< HEAD
            // 1. Create new products
            for (const newProd of newProducts) {
                const productData = {
<<<<<<< HEAD
                    name: newProd.name,
                    sellingPrice: aggregatedItem?.price || newProd.price,
                    costPrice: aggregatedItem?.costPrice || 0,
=======
                    name: newProd.sku, // Use SKU as the name for new products
                    sellingPrice: newProd.price,
                    costPrice: 0,
>>>>>>> d78c6df (Saat impor data excell. Jumlah transaksi atau nomer resi masukan kedalam)
                    stock: 0,
                    category: 'Impor',
                };
                const createdProduct = await addProduct(productData, userRole);
                newProductIds.set(newProd.sku, createdProduct.id);
                updatedDbProducts.push(createdProduct);
=======
            // 1. Create new products that were explicitly marked for creation
            for (const item of unrecognizedItems) {
                if (productMappings[item.sku] === CREATE_NEW_PRODUCT_VALUE) {
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
                }
>>>>>>> 62398f3 (Saat inpor data excell. Alialih membuat prodak baru. Lebih baik berikan)
            }

            // 2. Construct SaleItem[] for the cart
            const cartItems = aggregatedItems.map(item => {
                const dbProduct = matchedProducts.get(item.sku);
                let finalProductId = dbProduct?.id;

                if (item.isNew) {
                    const mappedId = productMappings[item.sku];
                    if(mappedId && mappedId !== CREATE_NEW_PRODUCT_VALUE) {
                        finalProductId = mappedId; // Use the mapped existing product ID
                    } else if (newProductIds.has(item.sku)) {
                        finalProductId = newProductIds.get(item.sku); // Use the newly created product ID
                    }
                }

                if (!finalProductId) return null;

                const productInfo = updatedDbProducts.find(p => p.id === finalProductId);

                if (!productInfo) return null;
                
                // Use the cost price from the (possibly edited) aggregated item
                const costPrice = item.costPrice;

                return {
                    product: {
                        id: productInfo.id,
                        name: productInfo.name,
                        category: productInfo.category,
                        subcategory: productInfo.subcategory,
                        costPrice: costPrice,
                    },
                    quantity: item.quantity,
                    price: item.price,
                    costPriceAtSale: costPrice,
                };
            }).filter((i): i is NonNullable<typeof i> => i !== null);
            
            onImportComplete(cartItems);

        } catch (error) {
            console.error('Import failed:', error);
            toast({
                title: 'Impor Gagal',
                description: 'Terjadi kesalahan saat menyimpan data. Perubahan telah dibatalkan.',
                variant: 'destructive',
            });
            setAnalysisState('review');
        }
    };


    const renderIdleState = () => (
        <div className="text-center py-10 px-6">
            <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Impor Penjualan dari File</h3>
            <p className="mt-2 text-sm text-muted-foreground">Unggah file Excel (disarankan), CSV, PDF, atau gambar (JPG, PNG). AI akan digunakan untuk PDF/gambar.</p>
            <div className="mt-6">
                 <Input id="file-upload" type="file" onChange={handleFileChange} accept=".csv,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" />
            </div>
        </div>
    );
    
    const renderAnalyzingState = () => (
        <div className="text-center py-20">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
            <h3 className="mt-4 text-lg font-medium">Memproses File...</h3>
            <p className="mt-2 text-sm text-muted-foreground">Harap tunggu, sistem sedang membaca dan mengekstrak data dari file Anda. Ini mungkin memakan waktu sejenak.</p>
        </div>
    );
    
    const ReviewState = () => {
        const totalQuantity = useMemo(() => aggregatedItems.reduce((sum, item) => sum + item.quantity, 0), [aggregatedItems]);
        const sortedDbProducts = useMemo(() => [...dbProducts].sort((a,b) => a.name.localeCompare(b.name)), [dbProducts]);

        return (
            <div className="space-y-4">
                 <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle>Hasil Analisis</AlertTitle>
                    <AlertDescription>
                        Sistem berhasil mengekstrak total <span className="font-bold">{totalQuantity} item</span> dari <span className="font-bold">{aggregatedItems.length} jenis produk</span>.
<<<<<<< HEAD
                        {uniqueOrderCount > 0 && <> Ditemukan <span className="font-bold">{uniqueOrderCount} transaksi</span> yang unik.</>}
=======
                        {resiCount > 0 && ` Ditemukan <span className="font-bold">${resiCount} resi</span> yang unik.`}
<<<<<<< HEAD
>>>>>>> d78c6df (Saat impor data excell. Jumlah transaksi atau nomer resi masukan kedalam)
                        Harap tinjau data di bawah ini. Produk baru akan dibuat untuk item yang tidak dikenali.
=======
                        Harap tinjau dan petakan produk yang tidak dikenali di bawah ini.
>>>>>>> 62398f3 (Saat inpor data excell. Alialih membuat prodak baru. Lebih baik berikan)
                    </AlertDescription>
                </Alert>
                
                {unrecognizedItems.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center"><AlertCircle className="h-4 w-4 mr-2 text-amber-500"/>Petakan Produk Tidak Dikenali</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-40">
                                <div className="space-y-4 pr-4">
                                {unrecognizedItems.map(item => (
                                    <div key={item.sku} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                        <div>
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
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
                                                    <span className="font-semibold text-primary">Buat Produk Baru</span>
                                                </SelectItem>
                                                {sortedDbProducts.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                         <CardTitle className="text-base flex items-center"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500"/>Ringkasan Impor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-64 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Produk</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">Jumlah</TableHead>
                                        <TableHead className="text-right">Harga Jual (Rata-rata)</TableHead>
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
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>

<<<<<<< HEAD
                <ScrollArea className="h-64 border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Produk</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead className="text-right">Harga Jual (Rata-rata)</TableHead>
                                <TableHead>Harga Modal</TableHead>
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
                                    <TableCell>
                                        <Input
                                            type="number"
                                            className="w-28 h-8 text-right"
                                            value={item.costPrice}
                                            onChange={(e) => handleCostPriceChange(item.sku, e.target.value)}
                                            placeholder="0"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={item.isNew ? "secondary" : "default"}>{item.isNew ? "Baru" : "OK"}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
=======
>>>>>>> 62398f3 (Saat inpor data excell. Alialih membuat prodak baru. Lebih baik berikan)
            </div>
        );
    }
    
    const renderErrorState = () => (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analisis Gagal</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
    );

    const getAnalysisButton = () => {
        const fileType = file?.type;
        const fileName = file?.name || '';
        if(fileType?.includes('spreadsheetml') || fileType?.includes('csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            return <><FileSpreadsheet className="mr-2 h-4 w-4"/>Proses File</>
        }
        return <><Wand2 className="mr-2 h-4 w-4"/>Analisis dengan AI</>
    }

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Impor Penjualan dari File</DialogTitle>
                <DialogDescription>
                    Unggah file Excel (disarankan), CSV, PDF, atau gambar untuk dianalisis.
                </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
                 {analysisState === 'idle' && renderIdleState()}
                {analysisState === 'analyzing' && renderAnalyzingState()}
                {analysisState === 'review' && <ReviewState />}
                {analysisState === 'error' && renderErrorState()}
                 {analysisState === 'saving' && (
                    <div className="text-center py-20">
                        <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                        <h3 className="mt-4 text-lg font-medium">Menyimpan Data...</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Produk baru sedang dibuat dan item ditambahkan ke keranjang.</p>
                    </div>
                )}
            </div>

            <DialogFooter>
                {analysisState === 'analyzing' || analysisState === 'saving' ? (
                    <Button disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {analysisState === 'analyzing' ? 'Sedang Menganalisis...' : 'Menyimpan...'}
                    </Button>
<<<<<<< HEAD
                ) : analysisState === 'review' ? (
                     <>
                        <Button variant="secondary" onClick={() => { setAnalysisState('idle'); setFile(null); setAggregatedItems([]); }}>Analisis Ulang</Button>
                        <Button onClick={handleConfirmImport}>
=======
                ) : analysisState === 'review' || analysisState === 'saving' ? (
                    <>
                        <Button variant="secondary" onClick={() => { setAnalysisState('idle'); setFile(null); setAggregatedItems([]); setUnrecognizedItems([]); setProductMappings({}); }}>Analisis Ulang</Button>
                        <Button onClick={handleConfirmImport} disabled={analysisState === 'saving' || !isMappingComplete}>
                            {analysisState === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
>>>>>>> 62398f3 (Saat inpor data excell. Alialih membuat prodak baru. Lebih baik berikan)
                            Konfirmasi & Impor ke Keranjang
                        </Button>
                    </>
                ) : (
                    <>
                        <DialogClose asChild>
                            <Button variant="secondary">Batal</Button>
                        </DialogClose>
                        <Button onClick={handleAnalyze} disabled={!file}>
                            {getAnalysisButton()}
                        </Button>
                    </>
                )}
            </DialogFooter>
        </DialogContent>
    );
};
