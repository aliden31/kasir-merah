
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Wallet, Download, Undo2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval } from 'date-fns';
import type { Sale, Expense, Product, Return } from '@/lib/types';
import { getSales, getExpenses, getProducts, getReturns } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { SaleItem } from '@/lib/types';

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
    const [returns, setReturns] = useState<Return[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [salesData, expensesData, productsData, returnsData] = await Promise.all([getSales(), getExpenses(), getProducts(), getReturns()]);
                setSales(salesData);
                setExpenses(expensesData);
                setProducts(productsData);
                setReturns(returnsData);
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
        if (!date?.from || !date.to) return { filteredSales: [], filteredExpenses: [], filteredReturns: [] };

        // Set time to end of day for 'to' date to include all of the last day.
        const toDate = new Date(date.to);
        toDate.setHours(23, 59, 59, 999);

        const interval = { start: date.from, end: toDate };
        
        const filteredSales = sales.filter(sale => isWithinInterval(sale.date, interval));
        const filteredExpenses = expenses.filter(expense => isWithinInterval(expense.date, interval));
        const filteredReturns = returns.filter(ret => isWithinInterval(ret.date, interval));

        return { filteredSales, filteredExpenses, filteredReturns };

    }, [sales, expenses, returns, date]);

    const financialSummary = useMemo(() => {
        const { filteredSales, filteredExpenses, filteredReturns } = filteredData;
        
        const totalSalesValue = filteredSales.reduce((sum, sale) => sum + sale.finalTotal, 0);
        
        const totalCostOfGoodsValue = filteredSales.reduce((totalCost, sale) => {
            const saleCost = sale.items.reduce((itemCost, item: SaleItem) => {
                const costPrice = typeof item.costPriceAtSale === 'number' ? item.costPriceAtSale : 0;
                return itemCost + (costPrice * item.quantity);
            }, 0);
            return totalCost + saleCost;
        }, 0);
        
        const totalReturnValue = filteredReturns.reduce((sum, ret) => sum + ret.totalRefund, 0);

        const totalCostOfReturnedGoods = filteredReturns.reduce((totalCost, ret) => {
            const originalSale = sales.find(s => s.id === ret.saleId);
            if (!originalSale) return totalCost;

            const returnCost = ret.items.reduce((itemCost, returnedItem) => {
                const originalSaleItem = originalSale.items.find(i => i.product.id === returnedItem.productId);
                const costPrice = originalSaleItem?.costPriceAtSale ?? 0;
                return itemCost + (costPrice * returnedItem.quantity);
            }, 0);
            
            return totalCost + returnCost;
        }, 0);

        const totalExpensesValue = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        const netSales = totalSalesValue - totalReturnValue;
        const netCOGS = totalCostOfGoodsValue - totalCostOfReturnedGoods;

        const grossProfit = netSales - netCOGS;
        const netProfit = grossProfit - totalExpensesValue;
        
        return { 
            totalSales: netSales,
            totalCostOfGoods: netCOGS,
            totalExpenses: totalExpensesValue,
            totalReturns: totalReturnValue,
            grossProfit, 
            netProfit 
        };
    }, [filteredData, sales]);

    const handleExport = () => {
        const { filteredSales, filteredExpenses, filteredReturns } = filteredData;

        const salesWithDetails = filteredSales.map(sale => {
            const totalPokok = sale.items.reduce((acc, item: SaleItem) => {
                const costPrice = typeof item.costPriceAtSale === 'number' ? item.costPriceAtSale : 0;
                return acc + (costPrice * item.quantity);
            }, 0);
            const labaKotor = sale.subtotal - totalPokok;
            return {
                ...sale,
                totalPokok,
                labaKotor,
            };
        });
        
        const totalReturnsValue = filteredReturns.reduce((acc, ret) => acc + ret.totalRefund, 0);
        
        const summary = {
            subTotal: salesWithDetails.reduce((acc, sale) => acc + sale.subtotal, 0),
            totalPokok: salesWithDetails.reduce((acc, sale) => acc + sale.totalPokok, 0),
            labaKotor: salesWithDetails.reduce((acc, sale) => acc + sale.labaKotor, 0),
            potFaktur: salesWithDetails.reduce((acc, sale) => acc + (sale.subtotal * sale.discount / 100), 0),
            totalPengeluaran: filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0),
            totalRetur: totalReturnsValue,
            labaJualBersih: 0,
        };
        
        const totalCostOfReturnedGoods = filteredReturns.reduce((totalCost, ret) => {
            const originalSale = sales.find(s => s.id === ret.saleId);
            if (!originalSale) return totalCost;

            const returnCost = ret.items.reduce((itemCost, returnedItem) => {
                const originalSaleItem = originalSale.items.find(i => i.product.id === returnedItem.productId);
                const costPrice = originalSaleItem?.costPriceAtSale ?? 0;
                return itemCost + (costPrice * returnedItem.quantity);
            }, 0);
            
            return totalCost + returnCost;
        }, 0);


        const round = (num: number) => Math.round(num);
        
        const netSales = summary.subTotal - totalReturnsValue;
        const netCOGS = summary.totalPokok - totalCostOfReturnedGoods;
        const grossProfitAfterReturns = netSales - netCOGS;
        summary.labaJualBersih = grossProfitAfterReturns - summary.potFaktur - summary.totalPengeluaran;


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
                "PELANGGAN", // Placeholder
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
        
        // Returns Section
        csvContent += "DAFTAR RETUR\n";
        csvContent += "Tanggal Retur,ID Transaksi Asal,Alasan,Total Refund\n";
        filteredReturns.forEach(ret => {
            const row = [
                format(ret.date, "yyyy-MM-dd"),
                `trx...${ret.saleId.slice(-6)}`,
                `"${ret.reason.replace(/"/g, '""')}"`,
                round(ret.totalRefund)
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
                `"${expense.name.replace(/"/g, '""')}"`,
                round(expense.amount)
            ].join(",");
            csvContent += row + "\n";
        });
        csvContent += "\n";

        // Summary Section
        csvContent += "TOTAL KESELURUHAN\n";
        csvContent += `Penjualan Bersih (Setelah Retur):,${round(netSales)}\n`;
        csvContent += `Total Pokok (HPP) Bersih:,${round(netCOGS)}\n`;
        csvContent += `Laba Kotor (Setelah Retur & HPP):,${round(grossProfitAfterReturns)}\n`;
        csvContent += `Potongan Diskon Total:,-${round(summary.potFaktur)}\n`;
        csvContent += `Total Pengeluaran:,${round(summary.totalPengeluaran)}\n`;
        csvContent += `Laba Bersih (Setelah Semua Biaya):,${round(summary.labaJualBersih)}\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "laporan_laba_rugi.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const kpiCards = [
        { title: 'Penjualan Bersih', value: formatCurrency(financialSummary.totalSales), icon: TrendingUp, color: 'text-green-500', view: 'penjualan' as View | undefined },
        { title: 'Total Modal (HPP)', value: formatCurrency(financialSummary.totalCostOfGoods), icon: ShoppingCart, color: 'text-blue-500', view: undefined },
        { title: 'Total Pengeluaran', value: formatCurrency(financialSummary.totalExpenses), icon: Wallet, color: 'text-orange-500', view: 'pengeluaran' as View | undefined },
        { title: 'Total Retur', value: formatCurrency(financialSummary.totalReturns), icon: Undo2, color: 'text-yellow-500', view: 'retur' as View | undefined },
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
