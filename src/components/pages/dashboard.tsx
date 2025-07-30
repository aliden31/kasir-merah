
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Package, TrendingUp, Users, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import type { Sale, Return, Product } from '@/lib/types';
import { getSales, getReturns, getProducts } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type View =
  | 'dashboard'
  | 'kasir'
  | 'produk'
  | 'penjualan'
  | 'retur'
  | 'pengeluaran'
  | 'laporan'
  | 'flash-sale'
  | 'pengaturan';

interface DashboardPageProps {
  onNavigate: (view: View) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const DashboardPage: FC<DashboardPageProps> = ({ onNavigate }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [returns, setReturns] = useState<Return[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [salesData, returnsData] = await Promise.all([getSales(), getReturns()]);
                setSales(salesData);
                setReturns(returnsData);
            } catch (error) {
                toast({ title: "Error", description: "Gagal memuat data dashboard.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const todayStats = useMemo(() => {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const interval = { start: todayStart, end: todayEnd };

        const salesToday = sales.filter(s => isWithinInterval(s.date, interval));
        const returnsToday = returns.filter(r => isWithinInterval(r.date, interval));

        const totalRevenue = salesToday.reduce((sum, sale) => sum + sale.finalTotal, 0);
        const totalReturnValue = returnsToday.reduce((sum, ret) => sum + ret.totalRefund, 0);

        const totalCostOfGoodsSold = salesToday.reduce((sum, sale) => 
            sum + sale.items.reduce((itemSum, item) => itemSum + (item.costPriceAtSale * item.quantity), 0), 0);
        
        const totalCostOfReturnedGoods = returnsToday.reduce((sum, ret) =>
            sum + ret.items.reduce((itemSum, item) => itemSum + (item.costPriceAtSale * item.quantity), 0), 0);

        const netRevenue = totalRevenue - totalReturnValue;
        const netCOGS = totalCostOfGoodsSold - totalCostOfReturnedGoods;
        const profit = netRevenue - netCOGS;
        
        const itemsSoldCount = salesToday.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
        
        const productSales = salesToday
            .flatMap(s => s.items)
            .reduce((acc, item) => {
                acc[item.product.id] = (acc[item.product.id] || 0) + item.quantity;
                return acc;
            }, {} as Record<string, number>);

        let bestSellingProduct = 'Tidak ada';
        let maxQuantity = 0;
        for (const sale of salesToday) {
            for (const item of sale.items) {
                if (productSales[item.product.id] > maxQuantity) {
                    maxQuantity = productSales[item.product.id];
                    bestSellingProduct = item.product.name;
                }
            }
        }
        
        return { netRevenue, profit, itemsSoldCount, bestSellingProduct };
    }, [sales, returns]);

    const weeklySalesChartData = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => {
            const date = subDays(new Date(), 6 - i);
            const dayStart = startOfDay(date);
            const dayEnd = endOfDay(date);
            const interval = { start: dayStart, end: dayEnd };

            const dailySales = sales.filter(s => isWithinInterval(s.date, interval));
            const total = dailySales.reduce((sum, sale) => sum + sale.finalTotal, 0);

            return {
                name: format(date, 'EEE', { locale: localeId }),
                Penjualan: total,
            };
        });
    }, [sales]);
    
    const recentActivity = useMemo(() => {
        const combined = [
            ...sales.map(s => ({ ...s, type: 'sale' as const })),
            ...returns.map(r => ({ ...r, type: 'return' as const }))
        ];
        return combined.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
    }, [sales, returns]);

    const salesMap = useMemo(() => {
        const sortedSales = sales.sort((a,b) => b.date.getTime() - a.date.getTime());
        return new Map(sortedSales.map((sale, index) => [sale.id, sortedSales.length - index]));
      }, [sales]);


    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Skeleton className="h-[350px] lg:col-span-4" />
                    <Skeleton className="h-[350px] lg:col-span-3" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Penjualan Hari Ini</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(todayStats.netRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Total penjualan bersih hari ini</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Laba Hari Ini</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(todayStats.profit)}</div>
                         <p className="text-xs text-muted-foreground">Perkiraan laba bersih hari ini</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Item Terjual</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{todayStats.itemsSoldCount}</div>
                        <p className="text-xs text-muted-foreground">Total item terjual hari ini</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Produk Terlaris</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{todayStats.bestSellingProduct}</div>
                        <p className="text-xs text-muted-foreground">Produk paling populer hari ini</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Penjualan 7 Hari Terakhir</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={weeklySalesChartData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${Number(value) / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                                    formatter={(value: number) => [formatCurrency(value), "Penjualan"]}
                                />
                                <Bar dataKey="Penjualan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Aktivitas Terbaru</CardTitle>
                        <CardDescription>Daftar transaksi dan retur terakhir.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {recentActivity.length > 0 ? recentActivity.map(activity => (
                             <div key={activity.id} className="flex items-center">
                                <div className="flex-grow">
                                    {activity.type === 'sale' ? (
                                        <>
                                            <p className="text-sm font-medium leading-none">
                                                Penjualan (trx {String(salesMap.get(activity.id)).padStart(4, '0')})
                                            </p>
                                            <p className="text-sm text-muted-foreground">{activity.items.length} item terjual</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm font-medium leading-none">
                                                Retur (trx {salesMap.has(activity.saleId) ? String(salesMap.get(activity.saleId)).padStart(4, '0') : `...${activity.saleId.slice(-6)}`})
                                            </p>
                                            <p className="text-sm text-muted-foreground">{activity.items.length} item diretur</p>
                                        </>
                                    )}
                                </div>
                                <div className={`ml-auto font-medium ${activity.type === 'sale' ? 'text-green-500' : 'text-destructive'}`}>
                                    {activity.type === 'sale' ? `+${formatCurrency(activity.finalTotal)}` : `-${formatCurrency(activity.totalRefund)}`}
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-center text-muted-foreground pt-10">Belum ada aktivitas.</p>
                        )}
                        <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => onNavigate('penjualan')}>
                            Lihat Semua Penjualan
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardPage;
