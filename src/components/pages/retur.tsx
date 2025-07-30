
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Return, Sale, ReturnItem } from '@/lib/types';
import { PlusCircle, MinusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getReturns, addReturn, getSales } from '@/lib/data-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};


const ReturnForm = ({ sales, onSave, onOpenChange }: { sales: Sale[], onSave: (item: Omit<Return, 'id'>) => Promise<void>, onOpenChange: (open: boolean) => void }) => {
    const [selectedSaleId, setSelectedSaleId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [itemsToReturn, setItemsToReturn] = useState<ReturnItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    const selectedSale = useMemo(() => sales.find(s => s.id === selectedSaleId), [selectedSaleId, sales]);

    useEffect(() => {
        // Reset items when a new sale is selected
        setItemsToReturn([]);
    }, [selectedSaleId]);

    const handleAddProductToReturn = (productId: string) => {
        if (!selectedSale) return;
        const saleItem = selectedSale.items.find(item => item.product.id === productId);
        if (saleItem && !itemsToReturn.find(item => item.productId === productId)) {
            setItemsToReturn(prev => [...prev, {
                productId: saleItem.product.id,
                productName: saleItem.product.name,
                quantity: 1,
                priceAtSale: saleItem.price,
                costPriceAtSale: saleItem.costPriceAtSale,
            }]);
        }
    };
    
    const updateReturnQuantity = (productId: string, quantity: number) => {
        const saleItem = selectedSale?.items.find(item => item.product.id === productId);
        const maxQuantity = saleItem?.quantity || 0;

        if (quantity <= 0) {
             setItemsToReturn(prev => prev.filter(item => item.productId !== productId));
             return;
        }

        if (quantity > maxQuantity) {
            toast({
                variant: "destructive",
                title: "Jumlah Melebihi Pembelian",
                description: `Jumlah retur tidak boleh melebihi jumlah pembelian (${maxQuantity})`,
            });
            quantity = maxQuantity;
        }

        setItemsToReturn(prev => prev.map(item => item.productId === productId ? { ...item, quantity } : item));
    }

    const handleSubmit = async () => {
        if (!selectedSaleId || itemsToReturn.length === 0) {
            toast({
                variant: "destructive",
                title: "Input Tidak Lengkap",
                description: "Pilih transaksi dan produk yang akan diretur.",
            });
            return;
        }

        setIsSaving(true);
        const totalRefund = itemsToReturn.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);

        const newReturn: Omit<Return, 'id'> = {
            saleId: selectedSaleId,
            items: itemsToReturn,
            reason,
            date: new Date(),
            totalRefund,
        };
        await onSave(newReturn);
        setIsSaving(false);
        onOpenChange(false);
    }
    
    // Products from the selected sale that haven't been added to the return list yet
    const availableProductsForReturn = selectedSale?.items.filter(
        saleItem => !itemsToReturn.some(returnItem => returnItem.productId === saleItem.product.id)
    ) || [];
    
    const sortedSales = useMemo(() => sales.sort((a,b) => b.date.getTime() - a.date.getTime()), [sales]);
    const salesMap = useMemo(() => new Map(sortedSales.map((sale, index) => [sale.id, sortedSales.length - index])), [sortedSales]);

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Tambah Retur Baru</DialogTitle>
                <DialogDescription>Pilih transaksi, lalu pilih produk yang akan dikembalikan.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="saleId" className="text-right">Transaksi</Label>
                    <Select onValueChange={setSelectedSaleId} value={selectedSaleId}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Pilih ID Transaksi..." />
                        </SelectTrigger>
                        <SelectContent>
                            {sortedSales.map((sale) => (
                                <SelectItem key={sale.id} value={sale.id}>
                                    trx {String(salesMap.get(sale.id)).padStart(4, '0')} - {sale.date.toLocaleDateString('id-ID')} - {formatCurrency(sale.finalTotal)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedSale && (
                    <>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Tambah Produk</Label>
                            <div className="col-span-3">
                                <Select onValueChange={handleAddProductToReturn} disabled={availableProductsForReturn.length === 0} value="">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih produk untuk diretur..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableProductsForReturn.map((item, index) => (
                                            <SelectItem key={`${item.product.id}-${index}`} value={item.product.id}>
                                                {item.product.name} (Dibeli: {item.quantity})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {itemsToReturn.length > 0 && (
                            <div className="col-span-4">
                                <Card>
                                    <CardContent className="p-4 max-h-48 overflow-y-auto">
                                    <h4 className="font-semibold mb-2">Produk yang akan diretur:</h4>
                                     <div className="space-y-4">
                                        {itemsToReturn.map(item => (
                                            <div key={item.productId} className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{item.productName}</p>
                                                    <p className="text-sm text-muted-foreground">{formatCurrency(item.priceAtSale)}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateReturnQuantity(item.productId, item.quantity - 1)}>
                                                        <MinusCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Input 
                                                        type="number" 
                                                        className="w-16 h-8 text-center" 
                                                        value={item.quantity}
                                                        onChange={(e) => updateReturnQuantity(item.productId, Number(e.target.value))}
                                                    />
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateReturnQuantity(item.productId, item.quantity + 1)}>
                                                        <PlusCircle className="h-4 w-4" />
                                                    </Button>
                                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateReturnQuantity(item.productId, 0)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                     </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                       
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="reason" className="text-right pt-2">Alasan</Label>
                            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="col-span-3" placeholder="Alasan pengembalian barang..." />
                        </div>
                    </>
                )}
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isSaving}>Batal</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={isSaving || itemsToReturn.length === 0 || !selectedSaleId}>
                    {isSaving ? 'Menyimpan...' : 'Simpan Retur'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

interface ReturPageProps {
    onDataChange: () => void;
}

const ReturPage: FC<ReturPageProps> = ({ onDataChange }) => {
  const [returns, setReturns] = useState<Return[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const [returnsData, salesData] = await Promise.all([getReturns(), getSales()]);
            setReturns(returnsData.sort((a,b) => b.date.getTime() - a.date.getTime()));
            setSales(salesData);
        } catch (error) {
            toast({ title: "Error", description: "Gagal memuat data.", variant: "destructive" });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, [toast]);

  const salesMap = useMemo(() => {
    const sortedSales = sales.sort((a,b) => b.date.getTime() - a.date.getTime());
    return new Map(sortedSales.map((sale, index) => [sale.id, sortedSales.length - index]));
  }, [sales]);
  
  const handleSaveReturn = async (itemData: Omit<Return, 'id'>) => {
    try {
        const newReturn = await addReturn(itemData);
        setReturns(prev => [newReturn, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
        toast({
            title: "Retur Disimpan",
            description: "Data retur baru telah berhasil disimpan.",
        });
        onDataChange();
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal menyimpan data retur.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
        console.error(error);
    }
  }

  if (loading) {
      return <div>Memuat data retur...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold">Manajemen Retur</h1>
            <p className="text-muted-foreground">Kelola pengembalian barang dari pelanggan.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
                <Button className="w-full md:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Catat Retur
                </Button>
            </DialogTrigger>
            <ReturnForm sales={sales} onSave={handleSaveReturn} onOpenChange={setFormOpen} />
        </Dialog>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Riwayat Retur</CardTitle>
            <CardDescription>Daftar semua pengembalian barang dari pelanggan.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[150px]">Tanggal</TableHead>
                        <TableHead>ID Transaksi Asal</TableHead>
                        <TableHead>Item Diretur</TableHead>
                        <TableHead>Alasan</TableHead>
                        <TableHead className="text-right">Total Refund</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {returns.length > 0 ? returns.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell>{item.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                            trx {salesMap.has(item.saleId) ? String(salesMap.get(item.saleId)).padStart(4, '0') : `...${item.saleId.slice(-6)}`}
                        </TableCell>
                        <TableCell>
                            <ul className="list-disc pl-4 text-sm">
                                {item.items.map((product, index) => (
                                    <li key={`${product.productId}-${index}`}>
                                        <span className="font-medium">{product.productName}</span> x {product.quantity}
                                    </li>
                                ))}
                            </ul>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.reason}</TableCell>
                        <TableCell className="text-right font-medium text-destructive">-{formatCurrency(item.totalRefund)}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                Belum ada data retur.
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

export default ReturPage;
