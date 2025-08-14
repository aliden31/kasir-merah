
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Package, TrendingUp, Users, Clock, Wallet } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import type { Sale, Return, Product, Expense, OtherIncome } from '@/lib/types';
import { getSales, getReturns, getProducts, getExpenses, getOtherIncomes } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const DashboardPage: FC<DashboardPageProps> = React.memo(({ onNavigate }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [returns, setReturns] = useState<Return[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [salesData, returnsData, expensesData, otherIncomesData] = await Promise.all([getSales(), getReturns(), getExpenses(), getOtherIncomes()]);
                setSales(salesData);
                setReturns(returnsData);
                setExpenses(expensesData);
                setOtherIncomes(otherIncomesData);
            } catch (error) {
                toast({ title: "Error", description: "Gagal memuat data dashboard.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    const last14DaysStats = useMemo(() => {
        const todayEnd = endOfDay(new Date());
        const last14DaysStart = startOfDay(subDays(new Date(), 13));
        const interval = { start: last14DaysStart, end: todayEnd };

        const salesInRange = sales.filter(s => isWithinInterval(s.date, interval));
        const returnsInRange = returns.filter(r => isWithinInterval(r.date, interval));
        const expensesInRange = expenses.filter(e => isWithinInterval(e.date, interval));
        const otherIncomesInRange = otherIncomes.filter(i => isWithinInterval(i.date, interval));

        const totalRevenue = salesInRange.reduce((sum, sale) => sum + sale.finalTotal, 0);
        const totalReturnValue = returnsInRange.reduce((sum, ret) => sum + ret.totalRefund, 0);
        const totalExpenses = expensesInRange.reduce((sum, exp) => sum + exp.amount, 0);
        const totalOtherIncomes = otherIncomesInRange.reduce((sum, income) => sum + income.amount, 0);

        const totalCostOfGoodsSold = salesInRange.reduce((sum, sale) => 
            sum + sale.items.reduce((itemSum, item) => itemSum + ((item.costPriceAtSale || 0) * item.quantity), 0), 0);
        
        const totalCostOfReturnedGoods = returnsInRange.reduce((sum, ret) =>
            sum + ret.items.reduce((itemSum, item) => itemSum + ((item.costPriceAtSale || 0) * item.quantity), 0), 0);

        const netRevenue = totalRevenue - totalReturnValue;
        const netCOGS = totalCostOfGoodsSold - totalCostOfReturnedGoods;
        const grossProfit = netRevenue - netCOGS;
        const profit = grossProfit - totalExpenses + totalOtherIncomes;
        
        const itemsSoldCount = salesInRange.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
        
        const productSales = salesInRange
            .flatMap(s => s.items)
            .reduce((acc, item) => {
                if (item.product) {
                    acc[item.product.id] = (acc[item.product.id] || 0) + item.quantity;
                }
                return acc;
            }, {} as Record<string, number>);

        let bestSellingProduct = 'Tidak ada';
        let maxQuantity = 0;
        for (const sale of salesInRange) {
            for (const item of sale.items) {
                 if (item.product && productSales[item.product.id] > maxQuantity) {
                    maxQuantity = productSales[item.product.id];
                    bestSellingProduct = item.product.name;
                }
            }
        }
        
        return { netRevenue, profit, itemsSoldCount, bestSellingProduct, totalExpenses };
    }, [sales, returns, expenses, otherIncomes]);

    const salesChartData = useMemo(() => {
        return Array.from({ length: 14 }).map((_, i) => {
            const date = subDays(new Date(), 13 - i);
            const dayStart = startOfDay(date);
            const dayEnd = endOfDay(date);
            const interval = { start: dayStart, end: dayEnd };

            const dailySales = sales.filter(s => isWithinInterval(s.date, interval));
            const total = dailySales.reduce((sum, sale) => sum + sale.finalTotal, 0);

            return {
                name: format(date, 'd/MM'),
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
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onNavigate('penjualan')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Penjualan (14 Hari)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(last14DaysStats.netRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Total penjualan bersih 14 hari terakhir</p>
                    </CardContent>
                </Card>
                 <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onNavigate('pengeluaran')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pengeluaran (14 Hari)</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(last14DaysStats.totalExpenses)}</div>
                         <p className="text-xs text-muted-foreground">Total pengeluaran 14 hari terakhir</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onNavigate('laporan')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Laba (14 Hari)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(last14DaysStats.profit)}</div>
                         <p className="text-xs text-muted-foreground">Perkiraan laba bersih 14 hari terakhir</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onNavigate('produk')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Produk Terlaris</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{last14DaysStats.bestSellingProduct}</div>
                        <p className="text-xs text-muted-foreground">Produk terpopuler 14 hari terakhir</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Penjualan 14 Hari Terakhir</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={salesChartData}>
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
});

DashboardPage.displayName = 'DashboardPage';
export default DashboardPage;
