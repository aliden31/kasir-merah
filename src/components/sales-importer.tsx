
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
import { getProducts, addProduct } from '@/lib/data-service';
import type { Product, UserRole, SaleItem } from '@/lib/types';
import { FileQuestion, Loader2, Wand2, CheckCircle2, AlertCircle, Sparkles, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

type AnalysisState = 'idle' | 'analyzing' | 'review' | 'saving' | 'error';
type AggregatedSaleItem = {
    sku: string;
    name: string;
    quantity: number;
    price: number;
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
    const [newProducts, setNewProducts] = useState<ExtractedSaleItem[]>([]);
    const [matchedProducts, setMatchedProducts] = useState<Map<string, Product>>(new Map());


    useEffect(() => {
        const fetchDbProducts = async () => {
            const products = await getProducts();
            setDbProducts(products);
        };
        fetchDbProducts();
    }, []);

    const processExtractedItems = (items: ExtractedSaleItem[]) => {
        const itemsBySku = new Map<string, { totalQuantity: number; totalValue: number; name: string; originalItems: ExtractedSaleItem[] }>();

        // 1. Group items and aggregate quantities and values
        items.forEach(item => {
            const skuKey = item.sku || item.name;
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
        const finalNewProducts = new Map<string, ExtractedSaleItem>();
        const finalMatchedProducts = new Map<string, Product>();

        for (const [skuKey, aggregatedData] of itemsBySku.entries()) {
            const { totalQuantity, totalValue, name, originalItems } = aggregatedData;
            const averagePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
            const representativeItem = originalItems[0];

            const dbProduct = dbProducts.find(p => p.id.toLowerCase() === skuKey.toLowerCase() || p.name.toLowerCase() === name.toLowerCase());
            const isNew = !dbProduct;

            if (isNew) {
                finalNewProducts.set(skuKey, representativeItem);
            } else {
                finalMatchedProducts.set(skuKey, dbProduct);
            }
            
            finalAggregatedItems.push({
                sku: skuKey,
                name,
                quantity: totalQuantity,
                price: averagePrice,
                isNew,
            });
        }
        
        // 3. Set the state
        setAggregatedItems(finalAggregatedItems);
        setNewProducts(Array.from(finalNewProducts.values()));
        setMatchedProducts(finalMatchedProducts);
        setAnalysisState('review');
    };


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };
    
    const handleExcelParse = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                const items: ExtractedSaleItem[] = json.map((row) => ({
                    sku: (row['Nama SKU'] || '').toString(),
                    name: (row['Nama SKU'] || '').toString(),
                    quantity: Number(row['Jumlah'] || 0),
                    price: Number(row['Harga Satuan (IDR)'] || 0),
                })).filter(item => item.name && item.quantity > 0);

                if (items.length > 0) {
                    processExtractedItems(items);
                } else {
                    setErrorMessage('Format Excel tidak sesuai atau tidak ada data yang valid. Pastikan ada kolom "Nama SKU", "Jumlah", dan "Harga Satuan (IDR)".');
                    setAnalysisState('error');
                }
            } catch (err) {
                 setErrorMessage('Gagal memproses file Excel. Pastikan formatnya benar.');
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
                        processExtractedItems(allItems);
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
        
        if(file.type.includes('spreadsheetml') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            handleExcelParse(file);
        } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            handlePdfImageParse(file);
        } else {
            setErrorMessage('Tipe file tidak didukung. Harap unggah file Excel, PDF, atau gambar.');
            setAnalysisState('error');
        }
    };

    const handleConfirmImport = async () => {
        setAnalysisState('saving');
        try {
            const newProductIds = new Map<string, string>();
            let updatedDbProducts = [...dbProducts];

            // 1. Create new products
            for (const newProd of newProducts) {
                const aggregatedItem = aggregatedItems.find(item => item.sku === newProd.sku);
                const productData = {
                    name: newProd.name,
                    sellingPrice: aggregatedItem?.price || newProd.price,
                    costPrice: 0,
                    stock: 0,
                    category: 'Impor',
                };
                const createdProduct = await addProduct(productData, userRole);
                newProductIds.set(newProd.sku, createdProduct.id);
                updatedDbProducts.push(createdProduct);
            }

            // 2. Construct SaleItem[] for the cart
            const cartItems = aggregatedItems.map(item => {
                const dbProduct = matchedProducts.get(item.sku);
                const newProductId = newProductIds.get(item.sku);
                const finalProductId = dbProduct?.id || newProductId;

                if (!finalProductId) return null;

                const productInfo = updatedDbProducts.find(p => p.id === finalProductId);

                if (!productInfo) return null;

                return {
                    product: {
                        id: productInfo.id,
                        name: productInfo.name,
                        category: productInfo.category,
                        subcategory: productInfo.subcategory,
                        costPrice: productInfo.costPrice,
                    },
                    quantity: item.quantity,
                    price: item.price,
                    costPriceAtSale: productInfo.costPrice,
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
            <p className="mt-2 text-sm text-muted-foreground">Unggah file Excel, PDF, atau gambar (JPG, PNG) yang berisi data penjualan Anda. AI akan digunakan untuk PDF/gambar.</p>
            <div className="mt-6">
                 <Input id="file-upload" type="file" onChange={handleFileChange} accept="application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" />
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
    
    const renderReviewState = () => (
        <div className="space-y-4">
             <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Hasil Analisis</AlertTitle>
                <AlertDescription>
                    Harap tinjau data yang diekstrak di bawah ini. Jika ada harga yang berbeda untuk SKU yang sama, harga jual akan dirata-ratakan.
                    Produk baru akan dibuat untuk item yang tidak dikenali.
                </AlertDescription>
            </Alert>
            
            <div className="grid md:grid-cols-2 gap-4">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500"/> Produk Dikenali</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {Array.from(matchedProducts.values()).length > 0 ? (
                           <ul className="text-sm space-y-1">
                               {Array.from(matchedProducts.values()).map(p => <li key={p.id}>{p.name}</li>)}
                           </ul>
                       ) : <p className="text-sm text-muted-foreground">Tidak ada produk yang cocok.</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center"><AlertCircle className="h-4 w-4 mr-2 text-amber-500"/>Produk Baru Akan Dibuat</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {newProducts.length > 0 ? (
                            <ul className="text-sm space-y-1">
                               {newProducts.map(p => <li key={p.sku}>{p.name}</li>)}
                           </ul>
                       ) : <p className="text-sm text-muted-foreground">Semua produk dikenali.</p>}
                    </CardContent>
                </Card>
            </div>

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
                                    <Badge variant={item.isNew ? "secondary" : "default"}>{item.isNew ? "Baru" : "OK"}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
    
    const renderErrorState = () => (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analisis Gagal</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
    );

    const getAnalysisButton = () => {
        const fileType = file?.type;
        if(fileType?.includes('spreadsheetml') || file?.name.endsWith('.xlsx') || file?.name.endsWith('.xls')) {
            return <><FileSpreadsheet className="mr-2 h-4 w-4"/>Proses Excel</>
        }
        return <><Wand2 className="mr-2 h-4 w-4"/>Analisis dengan AI</>
    }

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Impor Penjualan dari File</DialogTitle>
                <DialogDescription>
                    Unggah file Excel (disarankan untuk akurasi) atau PDF/gambar untuk dianalisis oleh AI.
                </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
                {analysisState === 'idle' && renderIdleState()}
                {analysisState === 'analyzing' && renderAnalyzingState()}
                {analysisState === 'review' && renderReviewState()}
                {analysisState === 'error' && renderErrorState()}
            </div>

            <DialogFooter>
                 {analysisState === 'idle' || analysisState === 'error' ? (
                     <>
                        <DialogClose asChild>
                            <Button variant="secondary">Batal</Button>
                        </DialogClose>
                        <Button onClick={handleAnalyze} disabled={!file || analysisState === 'analyzing'}>
                            {analysisState === 'analyzing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : getAnalysisButton()}
                        </Button>
                     </>
                 ) : analysisState === 'review' ? (
                     <>
                        <Button variant="secondary" onClick={() => { setAnalysisState('idle'); setFile(null); setAggregatedItems([]); }}>Analisis Ulang</Button>
                        <Button onClick={handleConfirmImport} disabled={analysisState === 'saving'}>
                            {analysisState === 'saving' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Konfirmasi & Impor ke Keranjang
                        </Button>
                     </>
                 ) : null}
            </DialogFooter>
        </DialogContent>
    );
};
