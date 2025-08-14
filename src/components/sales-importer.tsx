
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
import { getProducts, addProduct, addSale } from '@/lib/data-service';
import type { Product, UserRole } from '@/lib/types';
import { FileQuestion, Loader2, Wand2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

type AnalysisState = 'idle' | 'analyzing' | 'review' | 'saving' | 'error';

interface SalesImporterProps {
    onImportSuccess: () => void;
    userRole: UserRole;
}

export const SalesImporter: React.FC<SalesImporterProps> = ({ onImportSuccess, userRole }) => {
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

    const analysisResult = useMemo(() => {
        if (extractedSales.length === 0) return { newProducts: [], matchedProducts: new Map() };

        const allSkus = new Set(extractedSales.flatMap(s => s.items.map(i => i.sku)));
        const matchedProducts = new Map<string, Product>();
        const newProducts = new Map<string, ExtractedSaleItem>();

        allSkus.forEach(sku => {
            const dbProduct = dbProducts.find(p => p.id === sku || p.name.toLowerCase() === sku.toLowerCase());
            if (dbProduct) {
                matchedProducts.set(sku, dbProduct);
            } else {
                const item = extractedSales.flatMap(s => s.items).find(i => i.sku === sku);
                if (item) {
                    newProducts.set(sku, item);
                }
            }
        });

        return { newProducts: Array.from(newProducts.values()), matchedProducts };
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
            const { newProducts, matchedProducts } = analysisResult;
            const newProductIds = new Map<string, string>();

            // 1. Create new products
            for (const newProd of newProducts) {
                const productData = {
                    name: newProd.name,
                    sellingPrice: newProd.price,
                    costPrice: 0, // Default cost price, can be edited later
                    stock: 0,     // Default stock
                    category: 'Impor', // Default category
                };
                const createdProduct = await addProduct(productData, userRole);
                newProductIds.set(newProd.sku, createdProduct.id);
            }

            // 2. Add sales
            for (const sale of extractedSales) {
                const saleItems = sale.items.map(item => {
                    const dbProduct = matchedProducts.get(item.sku);
                    const newProductId = newProductIds.get(item.sku);
                    const productId = dbProduct?.id || newProductId;
                    
                    if (!productId) return null; // Should not happen

                    const productInfo = dbProduct || {
                        id: productId,
                        name: item.name,
                        category: 'Impor',
                        costPrice: 0,
                    };

                    return {
                        product: {
                            id: productInfo.id,
                            name: productInfo.name,
                            category: productInfo.category,
                            costPrice: productInfo.costPrice,
                        },
                        quantity: item.quantity,
                        price: item.price,
                        costPriceAtSale: productInfo.costPrice,
                    };
                }).filter((i): i is NonNullable<typeof i> => i !== null);
                
                const subtotal = saleItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

                const newSale = {
                    items: saleItems,
                    subtotal: subtotal,
                    discount: 0,
                    finalTotal: subtotal,
                    date: new Date(),
                };
                await addSale(newSale, userRole);
            }
            
            onImportSuccess();
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
                    Harap tinjau data yang diekstrak di bawah ini. Pastikan semuanya akurat sebelum mengonfirmasi impor.
                    Produk baru akan dibuat untuk item yang tidak dikenali.
                </AlertDescription>
            </Alert>
            
            <div className="grid md:grid-cols-2 gap-4">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500"/> Produk Dikenali</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {Array.from(analysisResult.matchedProducts.values()).length > 0 ? (
                           <ul className="text-sm space-y-1">
                               {Array.from(analysisResult.matchedProducts.values()).map(p => <li key={p.id}>{p.name}</li>)}
                           </ul>
                       ) : <p className="text-sm text-muted-foreground">Tidak ada produk yang cocok.</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center"><AlertCircle className="h-4 w-4 mr-2 text-amber-500"/>Produk Baru Akan Dibuat</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {analysisResult.newProducts.length > 0 ? (
                            <ul className="text-sm space-y-1">
                               {analysisResult.newProducts.map(p => <li key={p.sku}>{p.name}</li>)}
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
                            <TableHead className="text-right">Harga</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {extractedSales.flatMap(s => s.items).map((item, index) => {
                            const isNew = analysisResult.newProducts.some(p => p.sku === item.sku);
                            return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={isNew ? "secondary" : "default"}>{isNew ? "Baru" : "OK"}</Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
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
                            Konfirmasi & Impor Data
                        </Button>
                     </>
                 ) : null}
            </DialogFooter>
        </DialogContent>
    );
};
