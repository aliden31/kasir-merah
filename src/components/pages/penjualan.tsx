'use client';

import type { FC } from 'react';
import React from 'react';
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
import { placeholderSales } from '@/lib/placeholder-data';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import type { Sale } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const SalesChart = () => {
    const salesByItem = placeholderSales.flatMap(sale => sale.items).reduce((acc, item) => {
        acc[item.product.name] = (acc[item.product.name] || 0) + item.quantity;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(salesByItem)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    return (
        <Card>
            <CardHeader>
                <CardTitle>5 Item Terlaris</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
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
                {placeholderSales.map((sale: Sale) => (
                    <AccordionItem value={sale.id} key={sale.id}>
                        <AccordionTrigger>
                            <div className="flex justify-between w-full pr-4">
                                <span>ID Transaksi: {sale.id}</span>
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
                                    {sale.items.map((item, index) => (
                                        <TableRow key={index}>
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
            <SalesChart />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PenjualanPage;
