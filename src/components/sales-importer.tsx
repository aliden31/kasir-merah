
'use client';

import React, { useState, useMemo } from 'react';
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
import type { ExtractedSale, ExtractedSaleItem } from '@/ai/schemas/extract-sales-schema';
import { getProducts, addProduct } from '@/lib/data-service';
import type { Product, UserRole, SaleItem } from '@/lib/types';
import { FileQuestion, Loader2, Wand2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
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
    const [extractedSales, setExtractedSales] = useState<ExtractedSale[]>([]);
    const [dbProducts, setDbProducts] = useState<Product[]>([]);
    const [errorMessage, setErrorMessage] = useState('');
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchDbProducts = async () => {
            const products = await getProducts();
            setDbProducts(products);
        };
        fetchDbProducts();
    }, []);

    const aggregatedAnalysis = useMemo(() => {
        if (extractedSales.length === 0) return { newProducts: [], matchedProducts: new Map(), aggregatedItems: [] };

        const allItems = extractedSales.flatMap(s => s.items);
        
        // Group items by SKU
        const itemsBySku = allItems.reduce((acc, item) => {
            if (!acc[item.sku]) {
                acc[item.sku] = [];
            }
            acc[item.sku].push(item);
            return acc;
        }, {} as Record<string, ExtractedSaleItem[]>);
        
        const aggregatedItems: AggregatedSaleItem[] = [];
        const newProducts = new Map<string, ExtractedSaleItem>();
        const matchedProducts = new Map<string, Product>();

        for (const sku in itemsBySku) {
            const items = itemsBySku[sku];
            const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
            const averagePrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0) / totalQuantity;
            const name = items[0].name;

            const dbProduct = dbProducts.find(p => p.id === sku || p.name.toLowerCase() === sku.toLowerCase());
            const isNew = !dbProduct;
            
            if (isNew) {
                newProducts.set(sku, items[0]);
            } else {
                matchedProducts.set(sku, dbProduct);
            }

            aggregatedItems.push({
                sku,
                name,
                quantity: totalQuantity,
                price: averagePrice,
                isNew,
            });
        }
        
        return { 
            newProducts: Array.from(newProducts.values()), 
            matchedProducts,
            aggregatedItems
        };

    }, [extractedSales, dbProducts]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setAnalysisState('analyzing');
        setErrorMessage('');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const fileDataUri = reader.result as string;
                const result = await extractSales({ fileDataUri });
                
                if (result && result.sales.length > 0) {
                    setExtractedSales(result.sales);
                    setAnalysisState('review');
                } else {
                    setErrorMessage('AI tidak dapat menemukan data penjualan di dalam file. Coba file lain atau pastikan formatnya jelas.');
                    setAnalysisState('error');
                }
            };
            reader.onerror = () => {
                 setErrorMessage('Gagal membaca file. Silakan coba lagi.');
                 setAnalysisState('error');
            };
        } catch (error) {
            console.error('Analysis failed:', error);
            setErrorMessage('Terjadi kesalahan saat menganalisis file. Lihat konsol untuk detail.');
            setAnalysisState('error');
        }
    };

    const handleConfirmImport = async () => {
        setAnalysisState('saving');
        try {
            const { newProducts, matchedProducts, aggregatedItems } = aggregatedAnalysis;
            const newProductIds = new Map<string, string>();
            let updatedDbProducts = [...dbProducts];

            // 1. Create new products
            for (const newProd of newProducts) {
                const aggregatedItem = aggregatedItems.find(item => item.sku === newProd.sku);
                const productData = {
                    name: newProd.name,
                    sellingPrice: aggregatedItem?.price || newProd.price,
                    costPrice: 0, // Default cost price, can be edited later
                    stock: 0,     // Default stock
                    category: 'Impor', // Default category
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
            setAnalysisState('review'); // Go back to review state
        }
    };


    const renderIdleState = () => (
        <div className="text-center py-10 px-6">
            <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Impor Penjualan dari File</h3>
            <p className="mt-2 text-sm text-muted-foreground">Unggah file PDF atau gambar (JPG, PNG) yang berisi data daftar pengiriman Anda. AI akan mencoba mengekstrak data secara otomatis.</p>
            <div className="mt-6">
                 <Input id="file-upload" type="file" onChange={handleFileChange} accept="application/pdf,image/png,image/jpeg" />
            </div>
        </div>
    );
    
    const renderAnalyzingState = () => (
        <div className="text-center py-20">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
            <h3 className="mt-4 text-lg font-medium">Menganalisis File...</h3>
            <p className="mt-2 text-sm text-muted-foreground">Harap tunggu, AI sedang membaca dan mengekstrak data dari file Anda. Ini mungkin memakan waktu sejenak.</p>
        </div>
    );
    
    const renderReviewState = () => (
        <div className="space-y-4">
             <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Hasil Analisis AI</AlertTitle>
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
                       {Array.from(aggregatedAnalysis.matchedProducts.values()).length > 0 ? (
                           <ul className="text-sm space-y-1">
                               {Array.from(aggregatedAnalysis.matchedProducts.values()).map(p => <li key={p.id}>{p.name}</li>)}
                           </ul>
                       ) : <p className="text-sm text-muted-foreground">Tidak ada produk yang cocok.</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center"><AlertCircle className="h-4 w-4 mr-2 text-amber-500"/>Produk Baru Akan Dibuat</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {aggregatedAnalysis.newProducts.length > 0 ? (
                            <ul className="text-sm space-y-1">
                               {aggregatedAnalysis.newProducts.map(p => <li key={p.sku}>{p.name}</li>)}
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
                        {aggregatedAnalysis.aggregatedItems.map((item, index) => (
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

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Impor Penjualan dari File</DialogTitle>
                <DialogDescription>
                    Unggah file PDF atau gambar untuk dianalisis oleh AI.
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
                            {analysisState === 'analyzing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                            Analisis File
                        </Button>
                     </>
                 ) : analysisState === 'review' ? (
                     <>
                        <Button variant="secondary" onClick={() => setAnalysisState('idle')}>Analisis Ulang</Button>
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
