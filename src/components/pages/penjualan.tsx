
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
            const productId = typeof item.product === 'string' ? item.product : item.product.id;
            if (itemMap[productId]) {
                itemMap[productId].quantity += item.quantity;
            }
        });

        return Object.values(itemMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

    }, [sales, products]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>5 Item Terlaris</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesByItem}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                        <Tooltip
                            contentStyle={{
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                            }}
                        />
                        <Legend />
                        <Bar dataKey="quantity" fill="hsl(var(--primary))" name="Jumlah Terjual" radius={[4, 4, 0, 0]} />
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
                            const productDetail = productsData.find(p => p.id === item.product);
                            return {
                                ...item,
                                product: productDetail || { id: item.product, name: 'Produk Tidak Ditemukan' }
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
        <TabsList>
          <TabsTrigger value="riwayat">Riwayat Penjualan</TabsTrigger>
          <TabsTrigger value="diagram">Diagram Item Terjual</TabsTrigger>
        </TabsList>
        <TabsContent value="riwayat" className="mt-4">
             <Accordion type="single" collapsible className="w-full">
                {sales.map((sale: Sale, index) => (
                    <AccordionItem value={sale.id} key={sale.id}>
                        <AccordionTrigger>
                            <div className="flex justify-between w-full pr-4">
                                <span>ID Transaksi: trx {String(sales.length - index).padStart(3, '0')}</span>
                                <span className="text-muted-foreground">{sale.date.toLocaleDateString('id-ID')}</span>
                                <span className="font-semibold">{formatCurrency(sale.finalTotal)}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="p-4 bg-muted/50 rounded-md">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produk</TableHead>
                                        <TableHead className="text-right">Jumlah</TableHead>
                                        <TableHead className="text-right">Harga Satuan</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sale.items.map((item, itemIndex) => (
                                        <TableRow key={itemIndex}>
                                            <TableCell>{item.product.name}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                             <div className="mt-4 text-right space-y-1 text-sm pr-4">
                                <p>Subtotal: {formatCurrency(sale.subtotal)}</p>
                                <p>Diskon: {sale.discount}%</p>
                                <p className="font-bold">Total Akhir: {formatCurrency(sale.finalTotal)}</p>
                             </div>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
             </Accordion>
        </TabsContent>
        <TabsContent value="diagram" className="mt-4">
            <SalesChart sales={sales} products={products} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PenjualanPage;

