
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
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getProducts, updateProduct } from '@/lib/data-service';
import { Loader2 } from 'lucide-react';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const StokOpnamePage: FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [physicalStock, setPhysicalStock] = useState<Record<string, string>>({});
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const productsData = await getProducts();
            setProducts(productsData.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (error) {
            toast({ title: "Error", description: "Gagal memuat data produk.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [toast]);

    const handleStockChange = (productId: string, value: string) => {
        setPhysicalStock(prev => ({ ...prev, [productId]: value }));
    };

    const handleUpdateStock = async (product: Product) => {
        const newStockValue = physicalStock[product.id];
        if (newStockValue === undefined || newStockValue === '') {
            toast({ title: "Input Kosong", description: "Masukkan jumlah stok fisik terlebih dahulu.", variant: "destructive" });
            return;
        }

        const newStock = parseInt(newStockValue, 10);
        if (isNaN(newStock) || newStock < 0) {
            toast({ title: "Input Tidak Valid", description: "Jumlah stok harus angka positif.", variant: "destructive" });
            return;
        }

        setUpdatingId(product.id);
        try {
            await updateProduct(product.id, { ...product, stock: newStock });
            toast({ title: "Stok Diperbarui", description: `Stok untuk ${product.name} telah disesuaikan.` });
            
            // Optimistically update UI
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
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
                    <p className="text-muted-foreground">Sesuaikan stok fisik dengan data di sistem.</p>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Produk</CardTitle>
                    <div className="flex justify-between items-center">
                        <CardDescription>Total {filteredProducts.length} produk.</CardDescription>
                        <Input 
                            placeholder="Cari produk..."
                            className="max-w-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
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
                                                            handleUpdateStock(product);
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
                                                    onClick={() => handleUpdateStock(product)}
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
                                        <TableCell colSpan={5} className="text-center h-24">
                                            Tidak ada produk yang cocok dengan pencarian Anda.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default StokOpnamePage;

    