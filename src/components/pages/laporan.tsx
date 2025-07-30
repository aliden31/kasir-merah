'use client';

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { placeholderSales, placeholderExpenses, placeholderProducts } from '@/lib/placeholder-data';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Wallet, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import type { Sale } from '@/lib/types';

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

    const handleExport = () => {
        const salesWithDetails = placeholderSales.map(sale => {
            const totalPokok = sale.items.reduce((acc, item) => {
                const product = placeholderProducts.find(p => p.id === item.product.id);
                return acc + (product ? product.costPrice * item.quantity : 0);
            }, 0);
            const labaKotor = sale.subtotal - totalPokok;
            return {
                ...sale,
                totalPokok,
                labaKotor,
            };
        });
        
        const summary = {
            subTotal: salesWithDetails.reduce((acc, sale) => acc + sale.subtotal, 0),
            totalPokok: salesWithDetails.reduce((acc, sale) => acc + sale.totalPokok, 0),
            labaKotor: salesWithDetails.reduce((acc, sale) => acc + sale.labaKotor, 0),
            potFaktur: salesWithDetails.reduce((acc, sale) => acc + (sale.subtotal * sale.discount / 100), 0),
            totalPengeluaran: placeholderExpenses.reduce((acc, exp) => acc + exp.amount, 0),
            labaJualBersih: salesWithDetails.reduce((acc, sale) => acc + sale.labaKotor, 0) - placeholderExpenses.reduce((acc, exp) => acc + exp.amount, 0) - salesWithDetails.reduce((acc, sale) => acc + (sale.subtotal * sale.discount / 100), 0),
        };


        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "LAPORAN LABA RUGI\n\n";

        // Sales Section
        csvContent += "No Transaksi,Tanggal,Dept,Kode Pel,Nama Pelanggan,Sub Total,Total Pokok,Laba Kotor,Biaya Msk Total (+) Diskon,Biaya Lain,Laba Jual\n";
        salesWithDetails.forEach(sale => {
            const row = [
                `TRX-${format(sale.date, "yyyyMMdd")}`,
                format(sale.date, "yyyy-MM-dd"),
                "UTM",
                "PL0001", // Placeholder
                "SHOPEE", // Placeholder
                sale.subtotal,
                sale.totalPokok,
                sale.labaKotor,
                sale.subtotal * sale.discount / 100,
                0, // Biaya Lain Placeholder
                sale.finalTotal
            ].join(",");
            csvContent += row + "\n";
        });
        csvContent += "\n";

        // Expenses Section
        csvContent += "DAFTAR PENGELUARAN\n";
        csvContent += "Tanggal Pengeluaran,Kategori,Deskripsi,Jumlah\n";
        placeholderExpenses.forEach(expense => {
            const row = [
                format(expense.date, "yyyy-MM-dd"),
                expense.category,
                expense.name,
                expense.amount
            ].join(",");
            csvContent += row + "\n";
        });
        csvContent += "\n";

        // Summary Section
        csvContent += "TOTAL KESELURUHAN\n";
        csvContent += `Sub Total:,${summary.subTotal}\n`;
        csvContent += `Total Pokok:,${summary.totalPokok}\n`;
        csvContent += `Laba Kotor:,${summary.labaKotor}\n`;
        csvContent += `Biaya Msk Total:,0\n`;
        csvContent += `Pot. Faktur:,${summary.potFaktur}\n`;
        csvContent += `Total Pengeluaran:,${summary.totalPengeluaran}\n`;
        csvContent += `Biaya Lain:,0\n`;
        csvContent += `Laba Jual (Bersih):,${summary.labaJualBersih}\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "laporan_laba_rugi.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const kpiCards = [
        { title: 'Total Penjualan', value: formatCurrency(financialSummary.totalSales), icon: TrendingUp, color: 'text-green-500' },
        { title: 'Total Modal (HPP)', value: formatCurrency(financialSummary.totalCostOfGoods), icon: ShoppingCart, color: 'text-blue-500' },
        { title: 'Total Pengeluaran', value: formatCurrency(financialSummary.totalExpenses), icon: Wallet, color: 'text-orange-500' },
        { title: 'Laba Kotor', value: formatCurrency(financialSummary.grossProfit), icon: DollarSign, color: 'text-primary' },
        { title: 'Laba Bersih', value: formatCurrency(financialSummary.netProfit), icon: financialSummary.netProfit > 0 ? TrendingUp : TrendingDown, color: financialSummary.netProfit > 0 ? 'text-green-600' : 'text-red-500' },
    ];

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-bold">Laporan Arus Kas</h1>
            <div className="flex items-center gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className="w-[260px] justify-start text-left font-normal"
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
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Ekspor Laporan
                </Button>
            </div>
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
