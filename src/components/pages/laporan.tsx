'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Wallet, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { addDays, format, isWithinInterval } from 'date-fns';
import type { Sale, Expense, Product, UserRole, SaleItem } from '@/lib/types';
import { getSales, getExpenses, getProducts } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

type View =
  | 'kasir'
  | 'produk'
  | 'penjualan'
  | 'retur'
  | 'pengeluaran'
  | 'laporan'
  | 'flash-sale'
  | 'pengaturan';

interface LaporanPageProps {
  onNavigate: (view: View) => void;
}


const LaporanPage: FC<LaporanPageProps> = ({ onNavigate }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [salesData, expensesData, productsData] = await Promise.all([getSales(), getExpenses(), getProducts()]);
                setSales(salesData);
                setExpenses(expensesData);
                setProducts(productsData);
            } catch (error) {
                toast({ title: "Error", description: "Gagal memuat data laporan.", variant: "destructive" });
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [toast]);
    
    const filteredData = useMemo(() => {
        if (!date?.from) return { filteredSales: [], filteredExpenses: [] };

        const interval = { start: date.from, end: date.to || date.from };
        
        const filteredSales = sales.filter(sale => isWithinInterval(sale.date, interval));
        const filteredExpenses = expenses.filter(expense => isWithinInterval(expense.date, interval));

        return { filteredSales, filteredExpenses };

    }, [sales, expenses, date]);

    const financialSummary = useMemo(() => {
        const { filteredSales, filteredExpenses } = filteredData;
        
        const totalSales = filteredSales.reduce((sum, sale) => sum + sale.finalTotal, 0);
        
        const totalCostOfGoods = filteredSales.reduce((totalCost, sale) => {
            const saleCost = sale.items.reduce((itemCost, item: SaleItem & {product: any}) => {
                const productId = typeof item.product === 'string' ? item.product : item.product.id;
                const product = products.find(p => p.id === productId);
                const costPrice = item.costPriceAtSale ?? (product ? product.costPrice : 0);
                return itemCost + (costPrice * item.quantity);
            }, 0);
            return totalCost + saleCost;
        }, 0);

        const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const grossProfit = totalSales - totalCostOfGoods;
        const netProfit = grossProfit - totalExpenses;
        
        return { totalSales, totalCostOfGoods, totalExpenses, grossProfit, netProfit };
    }, [filteredData, products]);

    const handleExport = () => {
        const { filteredSales, filteredExpenses } = filteredData;

        const salesWithDetails = filteredSales.map(sale => {
            const totalPokok = sale.items.reduce((acc, item: SaleItem & {product: any}) => {
                const productId = typeof item.product === 'string' ? item.product : item.product.id;
                const product = products.find(p => p.id === productId);
                const costPrice = item.costPriceAtSale ?? (product ? product.costPrice : 0);
                return acc + (costPrice * item.quantity);
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
            totalPengeluaran: filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0),
            labaJualBersih: salesWithDetails.reduce((acc, sale) => acc + sale.labaKotor, 0) - filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0) - salesWithDetails.reduce((acc, sale) => acc + (sale.subtotal * sale.discount / 100), 0),
        };

        const round = (num: number) => Math.round(num);

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "LAPORAN LABA RUGI\n\n";

        // Sales Section
        csvContent += "No Transaksi,Tanggal,Dept,Kode Pel,Nama Pelanggan,Sub Total,Total Pokok,Laba Kotor,Biaya Msk Total (+) Diskon,Biaya Lain,Laba Jual\n";
        salesWithDetails.forEach((sale, index) => {
            const row = [
                `trx-${String(index + 1).padStart(4, '0')}`,
                format(sale.date, "yyyy-MM-dd"),
                "UTM",
                "PL0001", // Placeholder
                "SHOPEE", // Placeholder
                round(sale.subtotal),
                round(sale.totalPokok),
                round(sale.labaKotor),
                round(sale.subtotal * sale.discount / 100),
                0, // Biaya Lain Placeholder
                round(sale.finalTotal)
            ].join(",");
            csvContent += row + "\n";
        });
        csvContent += "\n";

        // Expenses Section
        csvContent += "DAFTAR PENGELUARAN\n";
        csvContent += "Tanggal Pengeluaran,Kategori,Deskripsi,Jumlah\n";
        filteredExpenses.forEach(expense => {
            const row = [
                format(expense.date, "yyyy-MM-dd"),
                expense.category,
                expense.name,
                round(expense.amount)
            ].join(",");
            csvContent += row + "\n";
        });
        csvContent += "\n";

        // Summary Section
        csvContent += "TOTAL KESELURUHAN\n";
        csvContent += `Sub Total:,${round(summary.subTotal)}\n`;
        csvContent += `Total Pokok:,${round(summary.totalPokok)}\n`;
        csvContent += `Laba Kotor:,${round(summary.labaKotor)}\n`;
        csvContent += `Biaya Msk Total:,0\n`;
        csvContent += `Pot. Faktur:,${round(summary.potFaktur)}\n`;
        csvContent += `Total Pengeluaran:,${round(summary.totalPengeluaran)}\n`;
        csvContent += `Biaya Lain:,0\n`;
        csvContent += `Laba Jual (Bersih):,${round(summary.labaJualBersih)}\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "laporan_laba_rugi.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const kpiCards = [
        { title: 'Total Penjualan', value: formatCurrency(financialSummary.totalSales), icon: TrendingUp, color: 'text-green-500', view: 'penjualan' as View | undefined },
        { title: 'Total Modal (HPP)', value: formatCurrency(financialSummary.totalCostOfGoods), icon: ShoppingCart, color: 'text-blue-500', view: undefined },
        { title: 'Total Pengeluaran', value: formatCurrency(financialSummary.totalExpenses), icon: Wallet, color: 'text-orange-500', view: 'pengeluaran' as View | undefined },
        { title: 'Laba Kotor', value: formatCurrency(financialSummary.grossProfit), icon: DollarSign, color: 'text-primary', view: undefined },
        { title: 'Laba Bersih', value: formatCurrency(financialSummary.netProfit), icon: financialSummary.netProfit >= 0 ? TrendingUp : TrendingDown, color: financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-red-500', view: undefined },
    ];

  if (loading) {
      return <div>Memuat data laporan...</div>;
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Laporan Arus Kas</h1>
              <p className="text-muted-foreground">Analisis pendapatan dan pengeluaran Anda dalam rentang waktu tertentu.</p>
            </div>
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
                <Button onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Ekspor
                </Button>
            </div>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpiCards.map(card => (
            <Card 
                key={card.title} 
                onClick={() => card.view && onNavigate(card.view)}
                className={card.view ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}
            >
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
            <CardDescription>Fitur detail arus kas sedang dalam pengembangan. Ini akan menampilkan grafik dan tabel terperinci.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-60 flex items-center justify-center bg-muted/50 rounded-md">
                <p className="text-muted-foreground">Grafik akan ditampilkan di sini.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LaporanPage;
