'use client';

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { placeholderSales, placeholderExpenses, placeholderProducts } from '@/lib/placeholder-data';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const LaporanPage: FC = () => {
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(2023, 9, 1),
        to: addDays(new Date(2023, 9, 28), 0),
    });
    
    const financialSummary = useMemo(() => {
        const totalSales = placeholderSales.reduce((sum, sale) => sum + sale.finalTotal, 0);
        
        const totalCostOfGoods = placeholderSales.reduce((totalCost, sale) => {
            const saleCost = sale.items.reduce((itemCost, item) => {
                const product = placeholderProducts.find(p => p.id === item.product.id);
                return itemCost + (product ? product.costPrice * item.quantity : 0);
            }, 0);
            return totalCost + saleCost;
        }, 0);

        const totalExpenses = placeholderExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const grossProfit = totalSales - totalCostOfGoods;
        const netProfit = grossProfit - totalExpenses;
        
        return { totalSales, totalCostOfGoods, totalExpenses, grossProfit, netProfit };
    }, []);

    const kpiCards = [
        { title: 'Total Penjualan', value: formatCurrency(financialSummary.totalSales), icon: TrendingUp, color: 'text-green-500' },
        { title: 'Total Modal (HPP)', value: formatCurrency(financialSummary.totalCostOfGoods), icon: ShoppingCart, color: 'text-blue-500' },
        { title: 'Total Pengeluaran', value: formatCurrency(financialSummary.totalExpenses), icon: Wallet, color: 'text-orange-500' },
        { title: 'Laba Kotor', value: formatCurrency(financialSummary.grossProfit), icon: DollarSign, color: 'text-primary' },
        { title: 'Laba Bersih', value: formatCurrency(financialSummary.netProfit), icon: financialSummary.netProfit > 0 ? TrendingUp : TrendingDown, color: financialSummary.netProfit > 0 ? 'text-green-600' : 'text-red-500' },
    ];

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Laporan Arus Kas</h1>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className="w-[300px] justify-start text-left font-normal"
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                    date.to ? (
                        <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                        </>
                    ) : (
                        format(date.from, "LLL dd, y")
                    )
                    ) : (
                    <span>Pilih rentang tanggal</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpiCards.map(card => (
            <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                    <card.icon className={`h-4 w-4 text-muted-foreground ${card.color}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
            </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Detail Arus Kas</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                Fitur detail arus kas sedang dalam pengembangan. Ini akan menampilkan grafik dan tabel terperinci dari pendapatan dan pengeluaran dari waktu ke waktu.
            </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LaporanPage;
