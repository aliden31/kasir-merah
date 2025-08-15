
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Product, UserRole, SaleItem as CartItem, SkuMapping } from '@/lib/types';
import { FileUp, Loader2, Link2, CheckCircle, AlertTriangle, XCircle, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getProducts, addSale, hasImportedFile, addImportedFile, getSkuMappings, saveSkuMapping } from '@/lib/data-service';
import { extractSales, ExtractSalesOutput } from '@/ai/flows/extract-sales-flow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

type AnalysisState = 'idle' | 'analyzing' | 'review' | 'saving' | 'error' | 'success';

interface SalesImporterPageProps {
  onDataChange: () => void;
  userRole: UserRole;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onNavigate: (view: 'kasir') => void;
}

const SalesImporterPage: FC<SalesImporterPageProps> = ({ onDataChange, userRole, setCart, onNavigate }) => {
    const [file, setFile] = useState<File | null>(null);
    const [fileDataUri, setFileDataUri] = useState<string | null>(null);
    const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [analysisResult, setAnalysisResult] = useState<ExtractSalesOutput | null>(null);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [skuMappings, setSkuMappings] = useState<Record<string, string>>({}); // importSku -> productId
    const [existingMappings, setExistingMappings] = useState<Record<string, string>>({});
    const [progress, setProgress] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchProductsAndMappings = async () => {
            try {
                const [products, mappings] = await Promise.all([getProducts(), getSkuMappings()]);
                setAllProducts(products);
                const initialMappings: Record<string, string> = {};
                mappings.forEach(m => {
                    initialMappings[m.importSku] = m.mappedProductId;
                });
                setExistingMappings(initialMappings);
            } catch (error) {
                toast({ title: 'Gagal memuat data produk', variant: 'destructive' });
            }
        };
        fetchProductsAndMappings();
    }, [toast]);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };
    
    const resetState = () => {
        setFile(null);
        setFileDataUri(null);
        setAnalysisState('idle');
        setErrorMessage('');
        setAnalysisResult(null);
        setSkuMappings({});
        setProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const handleProcessFile = async () => {
        if (!file) return;

        setAnalysisState('analyzing');
        setErrorMessage('');
        
        try {
            const hasBeenImported = await hasImportedFile(file.name);
            if (hasBeenImported) {
                setErrorMessage(`File "${file.name}" sudah pernah diimpor sebelumnya. Mengunggah file yang sama dapat menyebabkan duplikasi data.`);
                setAnalysisState('error');
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const uri = reader.result as string;
                setFileDataUri(uri);

                try {
                    const result = await extractSales({ fileDataUri: uri });
                    setAnalysisResult(result);
                    
                    const newMappings = { ...existingMappings };
                    let unmappedCount = 0;
                    result.sales.forEach(item => {
                        if (!newMappings[item.sku]) {
                            const foundProduct = allProducts.find(p => p.id === item.sku);
                            if (foundProduct) {
                                newMappings[item.sku] = foundProduct.id;
                            } else {
                                unmappedCount++;
                            }
                        }
                    });
                    setSkuMappings(newMappings);
                    
                    setAnalysisState('review');
                } catch (aiError) {
                    console.error(aiError);
                    setErrorMessage('AI gagal menganalisis file. Pastikan format file benar dan coba lagi.');
                    setAnalysisState('error');
                }
            };
            reader.onerror = () => {
                 setErrorMessage('Gagal membaca file. Silakan coba lagi.');
                 setAnalysisState('error');
            };
        } catch (dbError) {
            console.error(dbError);
            setErrorMessage('Gagal memeriksa riwayat file. Masalah koneksi database.');
            setAnalysisState('error');
        }
    };
    
    const handleMappingChange = (importSku: string, productId: string) => {
        setSkuMappings(prev => ({ ...prev, [importSku]: productId }));
    };

    const isMappingComplete = useMemo(() => {
        if (!analysisResult) return false;
        return analysisResult.sales.every(item => !!skuMappings[item.sku]);
    }, [analysisResult, skuMappings]);
    
    const unmappedItems = useMemo(() => {
        if (!analysisResult) return [];
        const seenSkus = new Set<string>();
        return analysisResult.sales.filter(item => {
            if (!skuMappings[item.sku] && !seenSkus.has(item.sku)) {
                seenSkus.add(item.sku);
                return true;
            }
            return false;
        });
    }, [analysisResult, skuMappings]);
    
    const mappedItems = useMemo(() => {
        if (!analysisResult) return [];
        const seenSkus = new Set<string>();
        return analysisResult.sales.filter(item => {
            if (skuMappings[item.sku] && !seenSkus.has(item.sku)) {
                seenSkus.add(item.sku);
                return true;
            }
            return false;
        });
    }, [analysisResult, skuMappings]);

    const handleConfirmImport = async () => {
        if (!analysisResult || !isMappingComplete || !file) return;

        setAnalysisState('saving');
        setProgress(0);

        try {
            // Save new mappings
            for (const importSku in skuMappings) {
                if (!existingMappings[importSku] || existingMappings[importSku] !== skuMappings[importSku]) {
                    const mappedProductId = skuMappings[importSku];
                    const product = allProducts.find(p => p.id === mappedProductId);
                    if (product) {
                        await saveSkuMapping({ importSku, mappedProductId: product.id, mappedProductName: product.name });
                    }
                }
            }

            const salesByOrderId = analysisResult.sales.reduce((acc, item) => {
                const mappedProductId = skuMappings[item.sku];
                if (!mappedProductId) return acc;

                const product = allProducts.find(p => p.id === mappedProductId);
                if (!product) return acc;
                
                if (!acc[item.orderId]) {
                    acc[item.orderId] = [];
                }

                acc[item.orderId].push({
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
                return acc;
            }, {} as Record<string, CartItem[]>);
            
            const salesToImport = Object.values(salesByOrderId);
            let processedCount = 0;
            const totalToProcess = salesToImport.length;

            for (const items of salesToImport) {
                const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const saleData = {
                    items,
                    subtotal,
                    discount: 0,
                    finalTotal: subtotal,
                    date: new Date(),
                };
                await addSale(saleData, userRole);
                processedCount++;
                setProgress((processedCount / totalToProcess) * 100);
            }
            
            await addImportedFile(file.name);
            onDataChange();
            setAnalysisState('success');
            
        } catch (error) {
            console.error(error);
            setErrorMessage('Terjadi kesalahan saat menyimpan data penjualan. Beberapa data mungkin tidak tersimpan.');
            setAnalysisState('error');
        }
    };
    
    const renderIdleState = () => (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>Impor Penjualan dari Excel</CardTitle>
                <CardDescription>Unggah file laporan penjualan (format .xlsx) untuk diimpor secara otomatis.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                 <div className="flex w-full max-w-sm items-center space-x-2">
                    <Input id="file-upload" type="file" accept=".xlsx" onChange={handleFileChange} ref={fileInputRef} />
                </div>
                <Button onClick={handleProcessFile} disabled={!file}>
                    <FileUp className="mr-2 h-4 w-4" /> Proses File
                </Button>
            </CardContent>
        </Card>
    );
    
    const renderAnalyzingState = () => (
         <Card className="text-center">
            <CardContent className="p-6 flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h3 className="text-lg font-semibold">Menganalisis File...</h3>
                <p className="text-muted-foreground">Mohon tunggu, AI sedang membaca dan menstrukturkan data dari file Anda.</p>
            </CardContent>
        </Card>
    );
    
    const renderReviewState = () => (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Hasil Analisis File</CardTitle>
                     <CardDescription>AI berhasil menganalisis file Anda. Berikut adalah ringkasannya.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                         <div className="bg-muted p-4 rounded-lg">
                             <p className="text-sm text-muted-foreground">Total Pesanan</p>
                             <p className="text-2xl font-bold">{analysisResult?.analysis.totalOrders}</p>
                         </div>
                         <div className="bg-muted p-4 rounded-lg">
                             <p className="text-sm text-muted-foreground">Total Item Terjual</p>
                             <p className="text-2xl font-bold">{analysisResult?.analysis.totalItems}</p>
                         </div>
                         <div className="bg-muted p-4 rounded-lg">
                             <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                             <p className="text-2xl font-bold">{formatCurrency(analysisResult?.analysis.totalRevenue || 0)}</p>
                         </div>
                     </div>
                </CardContent>
            </Card>
        
            {unmappedItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Link2 /> Pemetaan SKU Produk</CardTitle>
                        <CardDescription>
                            Beberapa SKU dari file Excel belum terpetakan ke produk di sistem Anda. 
                            Harap petakan SKU berikut untuk melanjutkan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU dari File</TableHead>
                                    <TableHead>Nama Produk dari File</TableHead>
                                    <TableHead>Petakan ke Produk Sistem</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {unmappedItems.map((item) => (
                                    <TableRow key={item.sku}>
                                        <TableCell className="font-mono">{item.sku}</TableCell>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell>
                                            <Select onValueChange={(value) => handleMappingChange(item.sku, value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih produk..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {allProducts.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.id})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {mappedItems.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CheckCircle className="text-green-500" /> SKU Sudah Terpetakan</CardTitle>
                         <CardDescription>
                            SKU berikut sudah berhasil dipetakan secara otomatis berdasarkan data sebelumnya atau data dari file.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-48">
                            <Table>
                                 <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU dari File</TableHead>
                                        <TableHead>Nama Produk dari File</TableHead>
                                        <TableHead>Dipetakan ke</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mappedItems.map((item) => {
                                        const mappedProduct = allProducts.find(p => p.id === skuMappings[item.sku]);
                                        return (
                                            <TableRow key={item.sku}>
                                                <TableCell className="font-mono">{item.sku}</TableCell>
                                                <TableCell>{item.productName}</TableCell>
                                                <TableCell className="font-medium text-primary">{mappedProduct?.name || 'Produk tidak ditemukan'}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

             <div className="flex justify-end gap-4 mt-6">
                <Button variant="outline" onClick={resetState}>Mulai Ulang</Button>
                <Button onClick={handleConfirmImport} disabled={!isMappingComplete}>
                    Konfirmasi & Impor Penjualan
                </Button>
            </div>
        </div>
    );
    
    const renderSavingState = () => (
         <Card className="text-center">
            <CardContent className="p-6 flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h3 className="text-lg font-semibold">Menyimpan Data Penjualan...</h3>
                <p className="text-muted-foreground">Proses: {Math.round(progress)}%</p>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground mt-2">Mohon jangan tutup halaman ini. Data sedang disimpan ke database.</p>
            </CardContent>
        </Card>
    );

    const renderErrorState = () => (
         <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Terjadi Kesalahan</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
            <div className="mt-4">
                 <Button variant="secondary" onClick={resetState}>Coba Lagi</Button>
            </div>
        </Alert>
    );
    
    const renderSuccessState = () => (
        <Card>
            <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <h3 className="text-2xl font-bold">Impor Berhasil!</h3>
                <p className="text-muted-foreground">
                    {analysisResult?.analysis.totalOrders} pesanan telah berhasil diimpor ke sistem. Stok produk telah diperbarui secara otomatis.
                </p>
                <Separator className="my-4" />
                <div className="flex gap-4">
                    <Button variant="outline" onClick={resetState}>Impor File Lain</Button>
                    <Button onClick={() => onNavigate('kasir')}>
                         <ShoppingCart className="mr-2 h-4 w-4" />
                        Lanjut ke Kasir
                    </Button>
                </div>
            </CardContent>
        </Card>
    );


    return (
        <div className="space-y-6">
            {analysisState === 'idle' && renderIdleState()}
            {analysisState === 'analyzing' && renderAnalyzingState()}
            {analysisState === 'review' && renderReviewState()}
            {analysisState === 'saving' && renderSavingState()}
            {analysisState === 'error' && renderErrorState()}
            {analysisState === 'success' && renderSuccessState()}
        </div>
    );
};

export default SalesImporterPage;
