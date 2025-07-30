
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { Sale, Product, SaleItem } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getSales, getProducts, updateSale, getSaleById } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Edit, Loader2, MinusCircle, PlusCircle, Trash2 } from 'lucide-react';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const EditSaleForm = ({ sale, onSave, onOpenChange }: { sale: Sale, onSave: () => void, onOpenChange: (open: boolean) => void }) => {
    const [editedSale, setEditedSale] = useState<Sale | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setEditedSale(JSON.parse(JSON.stringify(sale))); // Deep copy to avoid direct mutation
    }, [sale]);

    const updateItemQuantity = (productId: string, newQuantity: number) => {
        if (!editedSale) return;

        let updatedItems = editedSale.items.map(item =>
            item.product.id === productId ? { ...item, quantity: newQuantity } : item
        );

        // Remove item if quantity is 0 or less
        updatedItems = updatedItems.filter(item => item.quantity > 0);
        
        recalculateTotals(updatedItems, editedSale.discount);
    };

    const handleDiscountChange = (newDiscount: number) => {
        if (!editedSale) return;
        if (newDiscount < 0) newDiscount = 0;
        if (newDiscount > 100) newDiscount = 100;
        recalculateTotals(editedSale.items, newDiscount);
    };

    const recalculateTotals = (items: SaleItem[], discount: number) => {
        const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const finalTotal = subtotal * (1 - discount / 100);
        setEditedSale(prev => prev ? { ...prev, items, subtotal, discount, finalTotal } : null);
    };
    
    const handleSubmit = async () => {
      if (!editedSale) return;
      setIsSaving(true);
      try {
        await updateSale(sale, editedSale);
        toast({ title: "Transaksi Diperbarui", description: "Perubahan pada transaksi telah disimpan." });
        onSave(); // Callback to refresh data on the main page
        onOpenChange(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal memperbarui transaksi.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    };

    if (!editedSale) return null;

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Edit Transaksi (trx {String(sale.displayId).padStart(4, '0')})</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                 <ScrollArea className="h-64">
                    <div className="space-y-4 pr-6">
                        {editedSale.items.map((item) => (
                             <div key={item.product.id} className="flex items-center gap-4">
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{item.product.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}>
                                        <MinusCircle className="h-4 w-4" />
                                    </Button>
                                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}>
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="font-semibold text-sm w-24 text-right">{formatCurrency(item.price * item.quantity)}</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => updateItemQuantity(item.product.id, 0)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <Separator />
                <div className="w-full space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(editedSale.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <Label htmlFor="discount">Diskon (%)</Label>
                        <Input 
                            id="discount"
                            type="number"
                            value={editedSale.discount}
                            onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-sm"
                            step="0.1"
                            min="0"
                            max="100"
                        />
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <span>Potongan Diskon</span>
                        <span>-{formatCurrency(editedSale.subtotal * editedSale.discount / 100)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>{formatCurrency(editedSale.finalTotal)}</span>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isSaving}>Batal</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Simpan Perubahan'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}


const SalesChart = ({ sales, products }: { sales: Sale[], products: Product[] }) => {
    const salesByItem = useMemo(() => {
        const itemMap: Record<string, { name: string, quantity: number }> = {};
        
        products.forEach(p => {
            itemMap[p.id] = { name: p.name, quantity: 0 };
        });

        sales.flatMap(sale => sale.items).forEach(item => {
            const productId = item.product.id;
            if (itemMap[productId]) {
                itemMap[productId].quantity += item.quantity;
            }
        });

        return Object.values(itemMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

    }, [sales, products]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>10 Item Terlaris</CardTitle>
                <CardDescription>Grafik penjualan produk terbanyak.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={salesByItem} layout="vertical">
                        <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                        <YAxis type="category" dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={120} />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))' }}
                            contentStyle={{
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                            }}
                            formatter={(value: number) => [value, "Jumlah Terjual"]}
                        />
                        <Bar dataKey="quantity" fill="hsl(var(--primary))" name="Jumlah Terjual" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

const PenjualanPage: FC = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const { toast } = useToast();

    const fetchSalesData = async () => {
        try {
            const [salesData, productsData] = await Promise.all([getSales(), getProducts()]);
            const salesWithDisplayId = salesData
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map((sale, index) => ({
                    ...sale,
                    displayId: salesData.length - index,
                    items: sale.items.map((item: any) => ({
                        ...item,
                        product: item.product || { id: item.product, name: 'Produk Tidak Ditemukan', category: '' }
                    }))
                }));
            setSales(salesWithDisplayId);
            setProducts(productsData);
        } catch (error) {
            toast({ title: "Error", description: "Gagal memuat data penjualan.", variant: "destructive" });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSalesData();
    }, [toast]);
    
    const handleEditClick = async (saleId: string) => {
      const saleToEdit = sales.find(s => s.id === saleId);
      if (saleToEdit) {
        setEditingSale(saleToEdit);
      }
    };
    
    const handleSave = () => {
        fetchSalesData(); // Refresh all sales data
    };

    if (loading) {
        return <div>Memuat data penjualan...</div>
    }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Riwayat Penjualan</h1>
      {editingSale && (
        <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
            <EditSaleForm sale={editingSale} onSave={handleSave} onOpenChange={(open) => !open && setEditingSale(null)} />
        </Dialog>
      )}

      <Tabs defaultValue="riwayat">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="riwayat">Riwayat Transaksi</TabsTrigger>
          <TabsTrigger value="diagram">Diagram Penjualan</TabsTrigger>
        </TabsList>
        <TabsContent value="riwayat" className="mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>Daftar Transaksi</CardTitle>
                    <CardDescription>Berikut adalah daftar semua transaksi penjualan yang tercatat.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {sales.length > 0 ? sales.map((sale: Sale, index) => (
                            <AccordionItem value={sale.id} key={sale.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between items-center w-full pr-4 text-sm">
                                        <span className="font-semibold text-primary">ID: trx {String(sale.displayId).padStart(4, '0')}</span>
                                        <Badge variant="outline">{sale.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</Badge>
                                        <span className="font-bold text-base">{formatCurrency(sale.finalTotal)}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                <div className="p-4 bg-muted/50 rounded-md">
                                    <div className="flow-root">
                                        <dl className="-my-3 divide-y divide-border text-sm">
                                        {sale.items.map((item, itemIndex) => (
                                            <div key={itemIndex} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
                                                <dt className="font-medium text-foreground">{item.product.name}</dt>
                                                <dd className="text-muted-foreground sm:col-span-2 sm:text-right">{item.quantity} x {formatCurrency(item.price)} = <span className="font-medium text-foreground">{formatCurrency(item.price * item.quantity)}</span></dd>
                                            </div>
                                        ))}
                                        </dl>
                                    </div>
                                    <Separator className="my-4"/>
                                    <div className="flex justify-between items-end">
                                        <div className="text-right space-y-1 text-sm flex-grow">
                                            <p>Subtotal: <span className="font-medium">{formatCurrency(sale.subtotal)}</span></p>
                                            <p>Diskon: <span className="font-medium">{sale.discount}% (-{formatCurrency(sale.subtotal * sale.discount / 100)})</span></p>
                                            <p className="font-bold text-base border-t pt-2 mt-2">Total Akhir: <span className="text-primary">{formatCurrency(sale.finalTotal)}</span></p>
                                        </div>
                                         <Button variant="outline" size="sm" onClick={() => handleEditClick(sale.id)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Transaksi
                                        </Button>
                                    </div>
                                </div>
                                </AccordionContent>
                            </AccordionItem>
                        )) : (
                            <div className="text-center text-muted-foreground py-10">
                                <p>Belum ada riwayat penjualan.</p>
                            </div>
                        )}
                    </Accordion>
                </CardContent>
             </Card>
        </TabsContent>
        <TabsContent value="diagram" className="mt-4">
            <SalesChart sales={sales} products={products} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PenjualanPage;
