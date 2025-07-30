
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
import type { Sale, Product } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getSales, getProducts } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

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
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [salesData, productsData] = await Promise.all([getSales(), getProducts()]);
                const salesWithProductDetails = salesData
                    .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sort sales by date descending
                    .map(sale => ({
                        ...sale,
                        items: sale.items.map((item: any) => {
                            // The product object is already in the item, but we ensure it's up-to-date if needed
                            // For simplicity, we trust the data from the sales record.
                            // If a product was deleted, the info from sale time is still valuable.
                            const productDetail = item.product;
                            return {
                                ...item,
                                product: productDetail || { id: item.product, name: 'Produk Tidak Ditemukan', category: '' }
                            };
                        })
                    }));
                setSales(salesWithProductDetails);
                setProducts(productsData);
            } catch (error) {
                toast({ title: "Error", description: "Gagal memuat data penjualan.", variant: "destructive" });
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [toast]);

    if (loading) {
        return <div>Memuat data penjualan...</div>
    }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Riwayat Penjualan</h1>
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
                                        <span className="font-semibold text-primary">ID: trx {String(sales.length - index).padStart(4, '0')}</span>
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
                                    <div className="mt-4 text-right space-y-1 text-sm pr-4">
                                        <p>Subtotal: <span className="font-medium">{formatCurrency(sale.subtotal)}</span></p>
                                        <p>Diskon: <span className="font-medium">{sale.discount}% (-{formatCurrency(sale.subtotal * sale.discount / 100)})</span></p>
                                        <p className="font-bold text-base border-t pt-2 mt-2">Total Akhir: <span className="text-primary">{formatCurrency(sale.finalTotal)}</span></p>
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
