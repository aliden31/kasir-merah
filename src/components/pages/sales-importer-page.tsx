
'use client';

import React, { useState, useEffect } from 'react';
import type { Product, UserRole, SkuMapping, ExtractedSaleItem, ExtractedSales } from '@/lib/types';
import { getProducts, saveSkuMapping, getSkuMappings, addImportedFile, hasImportedFile, addExpense, addSale } from '@/lib/data-service';
import { extractSales } from '@/ai/flows/extract-sales-flow';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Upload, FileCheck, AlertCircle, CheckCircle, Package, ArrowRight, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

interface SalesImporterPageProps {
  onImportSuccess: () => void;
  userRole: UserRole;
}

type ImportStage = 'selectFile' | 'analyzing' | 'mapping' | 'confirming' | 'importing' | 'complete';

interface UnmappedSku {
    sku: string;
    productName: string;
    count: number;
}

const SalesImporterPage: FC<SalesImporterPageProps> = ({ onImportSuccess, userRole }) => {
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
    }, []);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setError(null);
        setExtractedData(null);
        setUnmappedSkus([]);
        setUserMappings({});
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
        }
    };

    const handleConfirmImport = async () => {
        if (!extractedData || !file) return;

        setStage('importing');
        const salesByOrderId: Record<string, any[]> = {};
        const allMappings = new Map(skuMappings.map(m => [m.importSku, m.mappedProductId]));

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
                     const newSale = {
                        items: saleItems,
                        subtotal: subtotal,
                        discount: 0,
                        finalTotal: subtotal,
                        date: new Date(), // Use current date for imported sales
                    };
                    await addSale(newSale, userRole);
                }

                processedSales++;
                setProgress((processedSales / totalSalesToProcess) * 100);
            }

            // Create expense for shipping labels
            const shippingExpense: Omit<Expense, 'id'> = {
                name: `Biaya Resi Shopee - ${file.name}`,
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
                    <Card className="text-center">
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
                    <Card className="text-center">
                        <CardContent className="p-10">
                            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                            <p className="mt-4 text-lg font-semibold">Menganalisis File...</p>
                            <p className="text-muted-foreground">AI sedang membaca dan memproses data penjualan Anda. Mohon tunggu sebentar.</p>
                        </CardContent>
                    </Card>
                );
            
            case 'mapping':
                return (
                     <Card>
                        <CardHeader>
                            <CardTitle>Langkah 2: Pemetaan SKU</CardTitle>
                            <CardDescription>Beberapa SKU dari file Anda tidak dikenali. Silakan petakan ke produk yang ada di sistem.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
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
                    <Card>
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
                     <Card className="text-center">
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
                     <Card className="text-center">
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
                             <Button variant="outline" className="w-full" onClick={() => setStage('selectFile')}>Impor File Lain</Button>
                        </CardFooter>
                    </Card>
                );
        }
    };


    return (
        <DialogContent className="max-w-xl">
           {renderContent()}
        </DialogContent>
    );
};

export default SalesImporterPage;
