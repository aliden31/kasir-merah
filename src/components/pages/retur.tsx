
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Return, Sale, ReturnItem, SaleItem } from '@/lib/types';
import { PlusCircle, MinusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getReturns, addReturn, getSales, getProducts } from '@/lib/data-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};


const ReturnForm = ({ salesWithDetails, onSave, onOpenChange }: { salesWithDetails: Sale[], onSave: (item: Omit<Return, 'id'>) => void, onOpenChange: (open: boolean) => void }) => {
    const [selectedSaleId, setSelectedSaleId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [itemsToReturn, setItemsToReturn] = useState<ReturnItem[]>([]);
    
    const selectedSale = useMemo(() => salesWithDetails.find(s => s.id === selectedSaleId), [selectedSaleId, salesWithDetails]);

    useEffect(() => {
        // Reset items when a new sale is selected
        setItemsToReturn([]);
    }, [selectedSaleId]);

    const handleAddProductToReturn = (productId: string) => {
        const productInSale = selectedSale?.items.find(item => item.product.id === productId);
        if (productInSale && !itemsToReturn.find(item => item.productId === productId)) {
            setItemsToReturn(prev => [...prev, {
                productId: productInSale.product.id,
                productName: productInSale.product.name,
                quantity: 1,
                priceAtSale: productInSale.price
            }]);
        }
    };
    
    const updateReturnQuantity = (productId: string, quantity: number) => {
        const productInSale = selectedSale?.items.find(item => item.product.id === productId);
        const maxQuantity = productInSale?.quantity || 0;

        if (quantity <= 0) {
             setItemsToReturn(prev => prev.filter(item => item.productId !== productId));
             return;
        }

        if (quantity > maxQuantity) {
            alert(`Jumlah retur tidak boleh melebihi jumlah pembelian (${maxQuantity})`);
            setItemsToReturn(prev => prev.map(item => item.productId === productId ? { ...item, quantity: maxQuantity } : item));
            return;
        }

        setItemsToReturn(prev => prev.map(item => item.productId === productId ? { ...item, quantity } : item));
    }

    const handleSubmit = () => {
        if (!selectedSaleId || itemsToReturn.length === 0) {
            alert('Pilih transaksi dan produk yang akan diretur.');
            return;
        }

        const totalRefund = itemsToReturn.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);

        const newReturn: Omit<Return, 'id'> = {
            saleId: selectedSaleId,
            items: itemsToReturn,
            reason,
            date: new Date(),
            totalRefund,
        };
        onSave(newReturn);
        onOpenChange(false);
    }

    const availableProductsForReturn = selectedSale?.items.filter(
        saleItem => !itemsToReturn.some(returnItem => returnItem.productId === saleItem.product.id)
    ) || [];

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Tambah Retur Baru</DialogTitle>
                <DialogDescription>Pilih transaksi, lalu pilih produk yang akan dikembalikan.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="saleId" className="text-right">Transaksi</Label>
                    <Select onValueChange={setSelectedSaleId}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Pilih ID Transaksi..." />
                        </SelectTrigger>
                        <SelectContent>
                            {salesWithDetails.map((sale, index) => (
                                <SelectItem key={sale.id} value={sale.id}>
                                    trx {String(salesWithDetails.length - index).padStart(4, '0')} - {sale.date.toLocaleDateString('id-ID')} - {formatCurrency(sale.finalTotal)}
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
                                    <CardContent className="p-4">
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
                    <Button type="button" variant="secondary">Batal</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={itemsToReturn.length === 0}>Simpan Retur</Button>
            </DialogFooter>
        </DialogContent>
    )
}

const ReturPage: FC = () => {
  const [returns, setReturns] = useState<Return[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
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
  
  const handleSaveReturn = async (itemData: Omit<Return, 'id'>) => {
    try {
        const newReturn = await addReturn(itemData);
        setReturns(prev => [newReturn, ...prev]);
        toast({
            title: "Retur Disimpan",
            description: "Data retur baru telah berhasil disimpan.",
        });
        // re-fetch sales to reflect any potential changes (though none are made here)
        const updatedSales = await getSales();
        setSales(updatedSales);
    } catch(error) {
        toast({ title: "Error", description: "Gagal menyimpan data retur.", variant: "destructive" });
        console.error(error);
    }
  }
  
  const salesWithDetails = useMemo(() => {
    return sales
        .map(sale => ({
            ...sale,
            items: sale.items.map((item: SaleItem) => ({
                ...item,
                product: item.product || { id: 'unknown', name: 'Produk Dihapus', category: '', costPrice: 0, sellingPrice: 0, stock: 0 }
            }))
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());
}, [sales]);


  if (loading) {
      return <div>Memuat data retur...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Retur</h1>
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Catat Retur
                </Button>
            </DialogTrigger>
            <ReturnForm salesWithDetails={salesWithDetails} onSave={handleSaveReturn} onOpenChange={setFormOpen} />
        </Dialog>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Riwayat Retur</CardTitle>
            <CardDescription>Daftar semua pengembalian barang dari pelanggan.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[calc(100vh-20rem)]">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                        <TableHead className="w-[150px]">Tanggal</TableHead>
                        <TableHead>ID Transaksi</TableHead>
                        <TableHead>Item Diretur</TableHead>
                        <TableHead>Alasan</TableHead>
                        <TableHead className="text-right">Total Refund</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {returns.length > 0 ? returns.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell>{item.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">trx...{item.saleId.slice(-6)}</TableCell>
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
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReturPage;
