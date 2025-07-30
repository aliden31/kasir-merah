
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
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
import type { Product, StockOpnameLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProducts, updateProduct, addStockOpnameLog, getStockOpnameLogs } from '@/lib/data-service';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { doc } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


const StokOpnamePage: FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [logs, setLogs] = useState<StockOpnameLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [physicalStock, setPhysicalStock] = useState<Record<string, string>>({});
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<Record<string, boolean>>({});
    const [isMassUpdating, setIsMassUpdating] = useState(false);
    const { toast } = useToast();

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [productsData, logsData] = await Promise.all([getProducts(), getStockOpnameLogs()]);
            setProducts(productsData.sort((a,b) => a.name.localeCompare(b.name)));
            setLogs(logsData.sort((a,b) => b.date.getTime() - a.date.getTime()));
        } catch (error) {
            toast({ title: "Error", description: "Gagal memuat data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [toast]);

    const handleStockChange = (productId: string, value: string) => {
        setPhysicalStock(prev => ({ ...prev, [productId]: value }));
    };

    const handleUpdateStock = async (product: Product, newStockValue: number | string, notes: string) => {
        if (newStockValue === undefined || newStockValue === '') {
            toast({ title: "Input Kosong", description: "Masukkan jumlah stok fisik terlebih dahulu.", variant: "destructive" });
            return;
        }
        
        const newStock = parseInt(String(newStockValue), 10);
        if (isNaN(newStock) || newStock < 0) {
            toast({ title: "Input Tidak Valid", description: "Jumlah stok harus angka positif.", variant: "destructive" });
            return;
        }

        setUpdatingId(product.id);
        try {
            await updateProduct(product.id, { stock: newStock });
            await addStockOpnameLog(product, newStock, notes);

            toast({ title: "Stok Diperbarui", description: `Stok untuk ${product.name} telah disesuaikan.` });
            
            // Refetch all data to ensure consistency
            await fetchInitialData();
            
            // Clear input field for the updated product
            setPhysicalStock(prev => {
                const updated = { ...prev };
                delete updated[product.id];
                return updated;
            });
        } catch (error) {
            toast({ title: "Error", description: "Gagal memperbarui stok.", variant: "destructive" });
        } finally {
            setUpdatingId(null);
        }
    };

    const handleSelectProduct = (productId: string, isSelected: boolean) => {
        setSelectedProducts(prev => ({...prev, [productId]: isSelected}));
    };

    const handleSelectAll = (isSelected: boolean) => {
        const newSelectedProducts: Record<string, boolean> = {};
        if (isSelected) {
            filteredProducts.forEach(p => newSelectedProducts[p.id] = true);
        }
        setSelectedProducts(newSelectedProducts);
    }

    const selectedProductIds = useMemo(() => {
        return Object.keys(selectedProducts).filter(id => selectedProducts[id]);
    }, [selectedProducts]);

    const handleSetSelectedToZero = async () => {
        if(selectedProductIds.length === 0) return;
        setIsMassUpdating(true);
        const batch = writeBatch(db);
        const logs: Omit<StockOpnameLog, 'id'>[] = [];

        for (const productId of selectedProductIds) {
            const product = products.find(p => p.id === productId);
            if(product && product.stock !== 0) {
                const productRef = doc(db, "products", productId);
                batch.update(productRef, { stock: 0 });

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
        }
        
        try {
            await batch.commit();
            toast({ title: "Sukses", description: `${selectedProductIds.length} produk berhasil diatur stoknya menjadi 0.`});
            await fetchInitialData();
            setSelectedProducts({});
        } catch (error) {
            toast({ title: "Error", description: "Gagal memperbarui stok secara massal.", variant: "destructive" });
        } finally {
            setIsMassUpdating(false);
        }
    };
    
    const filteredProducts = useMemo(() => {
        return products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    if (loading) {
        return <div>Memuat data produk...</div>
    }

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Stok Opname</h1>
                    <p className="text-muted-foreground">Sesuaikan stok fisik dengan data di sistem dan lihat riwayatnya.</p>
                </div>
            </div>
            
            <Tabs defaultValue="adjustment">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="adjustment">Penyesuaian Stok</TabsTrigger>
                    <TabsTrigger value="history">Riwayat Opname</TabsTrigger>
                </TabsList>
                <TabsContent value="adjustment" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daftar Produk</CardTitle>
                             <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                                <CardDescription>Total {filteredProducts.length} produk.</CardDescription>
                                <div className="flex w-full md:w-auto items-center gap-2">
                                    <Input 
                                        placeholder="Cari produk..."
                                        className="w-full md:w-64"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {selectedProductIds.length > 0 && (
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" disabled={isMassUpdating}>
                                                    {isMassUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                    Atur Stok 0 ({selectedProductIds.length})
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Konfirmasi Aksi</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Anda akan mengatur stok untuk {selectedProductIds.length} produk menjadi 0. Aksi ini akan dicatat dalam riwayat. Apakah Anda yakin?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleSetSelectedToZero}>Ya, Lanjutkan</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40px]">
                                                <Checkbox
                                                    checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                                                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                                />
                                            </TableHead>
                                            <TableHead className="w-2/5">Nama Produk</TableHead>
                                            <TableHead className="text-center">Stok Sistem</TableHead>
                                            <TableHead className="text-center">Stok Fisik</TableHead>
                                            <TableHead className="text-center">Selisih</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.length > 0 ? filteredProducts.map((product) => {
                                            const physical = physicalStock[product.id];
                                            const physicalCount = physical !== undefined && physical !== '' ? parseInt(physical, 10) : null;
                                            const difference = physicalCount !== null ? physicalCount - product.stock : null;
                                            
                                            return (
                                                <TableRow key={product.id}>
                                                     <TableCell>
                                                        <Checkbox
                                                            checked={!!selectedProducts[product.id]}
                                                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">{product.name}</TableCell>
                                                    <TableCell className="text-center">{product.stock}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Input 
                                                            type="number"
                                                            className="w-24 mx-auto"
                                                            placeholder="Jumlah"
                                                            value={physicalStock[product.id] || ''}
                                                            onChange={(e) => handleStockChange(product.id, e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleUpdateStock(product, physicalStock[product.id], 'Penyesuaian manual');
                                                                }
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className={`text-center font-medium ${
                                                        difference === null ? '' :
                                                        difference > 0 ? 'text-green-500' :
                                                        difference < 0 ? 'text-destructive' : ''
                                                    }`}>
                                                        {difference !== null ? (difference > 0 ? `+${difference}` : difference) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button 
                                                            size="sm"
                                                            onClick={() => handleUpdateStock(product, physicalStock[product.id], 'Penyesuaian manual')}
                                                            disabled={updatingId === product.id || physicalStock[product.id] === undefined}
                                                        >
                                                            {updatingId === product.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Sesuaikan
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-24">
                                                    Tidak ada produk yang cocok dengan pencarian Anda.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="history" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Riwayat Penyesuaian Stok</CardTitle>
                            <CardDescription>Daftar semua perubahan stok yang dilakukan melalui stok opname.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tanggal</TableHead>
                                            <TableHead>Nama Produk</TableHead>
                                            <TableHead>Catatan</TableHead>
                                            <TableHead className="text-center">Stok Sebelumnya</TableHead>
                                            <TableHead className="text-center">Stok Baru</TableHead>
                                            <TableHead className="text-center">Perubahan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.length > 0 ? logs.map(log => {
                                            const change = log.newStock - log.previousStock;
                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell>{new Date(log.date).toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className="font-medium">{log.productName}</TableCell>
                                                    <TableCell className="text-muted-foreground">{log.notes}</TableCell>
                                                    <TableCell className="text-center">{log.previousStock}</TableCell>
                                                    <TableCell className="text-center">{log.newStock}</TableCell>
                                                    <TableCell className={`text-center font-bold ${change > 0 ? 'text-green-500' : 'text-destructive'}`}>
                                                        {change > 0 ? `+${change}` : change}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        }) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center h-24">
                                                    Belum ada riwayat penyesuaian stok.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                             </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default StokOpnamePage;
