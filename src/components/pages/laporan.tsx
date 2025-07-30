
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Wallet, Download, Undo2, Printer } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, startOfDay, eachDayOfInterval, endOfDay } from 'date-fns';
import type { Sale, Expense, Return, SaleItem, ReturnItem } from '@/lib/types';
import { getSales, getExpenses, getReturns } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

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

interface LaporanPageProps {
  onNavigate: (view: View) => void;
}


const LaporanPage: FC<LaporanPageProps> = ({ onNavigate }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [returns, setReturns] = useState<Return[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    });


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [salesData, expensesData, returnsData] = await Promise.all([getSales(), getExpenses(), getReturns()]);
                setSales(salesData);
                setExpenses(expensesData);
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

        const toDate = endOfDay(date.to);
        const interval = { start: startOfDay(date.from), end: toDate };
        
        const filteredSales = sales.filter(sale => isWithinInterval(new Date(sale.date), interval));
        const filteredExpenses = expenses.filter(expense => isWithinInterval(new Date(expense.date), interval));
        const filteredReturns = returns.filter(ret => isWithinInterval(new Date(ret.date), interval));

        return { filteredSales, filteredExpenses, filteredReturns };

    }, [sales, expenses, returns, date]);
    
    const dailyChartData = useMemo(() => {
        const { filteredSales, filteredExpenses, filteredReturns } = filteredData;
        if (!date?.from || !date.to) return [];

        const days = eachDayOfInterval({
          start: date.from,
          end: date.to,
        });

        return days.map(day => {
            const dayStart = startOfDay(day);
            const dayEnd = endOfDay(day);

            const daySales = filteredSales.filter(s => isWithinInterval(new Date(s.date), { start: dayStart, end: dayEnd }));
            const dayExpenses = filteredExpenses.filter(e => isWithinInterval(new Date(e.date), { start: dayStart, end: dayEnd }));
            const dayReturns = filteredReturns.filter(r => isWithinInterval(new Date(r.date), { start: dayStart, end: dayEnd }));

            const totalSalesValue = daySales.reduce((sum, sale) => sum + sale.finalTotal, 0);
            const totalReturnValue = dayReturns.reduce((sum, ret) => sum + ret.totalRefund, 0);
            const totalExpensesValue = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

            const totalCostOfGoodsSold = daySales.reduce((totalCost, sale) => {
                return totalCost + sale.items.reduce((itemCost, item: SaleItem) => itemCost + (item.costPriceAtSale * item.quantity), 0);
            }, 0);
            const totalCostOfReturnedGoods = dayReturns.reduce((totalCost, ret) => {
                return totalCost + ret.items.reduce((itemCost, item: ReturnItem) => itemCost + (item.costPriceAtSale * item.quantity), 0);
            }, 0);

            const netSales = totalSalesValue - totalReturnValue;
            const netCOGS = totalCostOfGoodsSold - totalCostOfReturnedGoods;
            const grossProfit = netSales - netCOGS;
            const netProfit = grossProfit - totalExpensesValue;
            
            return {
                date: format(day, 'dd/MM'),
                "Penjualan Bersih": netSales,
                "Laba Bersih": netProfit,
                "Pengeluaran": totalExpensesValue
            };
        });
    }, [filteredData, date]);


    const financialSummary = useMemo(() => {
        const { filteredSales, filteredExpenses, filteredReturns } = filteredData;
        
        const totalSalesValue = filteredSales.reduce((sum, sale) => sum + sale.finalTotal, 0);
        const totalReturnValue = filteredReturns.reduce((sum, ret) => sum + ret.totalRefund, 0);

        const totalCostOfGoodsSold = filteredSales.reduce((totalCost, sale) => {
            const saleCost = sale.items.reduce((itemCost, item: SaleItem) => {
                const costPrice = typeof item.costPriceAtSale === 'number' ? item.costPriceAtSale : 0;
                return itemCost + (costPrice * item.quantity);
            }, 0);
            return totalCost + saleCost;
        }, 0);

        const totalCostOfReturnedGoods = filteredReturns.reduce((totalCost, ret) => {
             const returnCost = ret.items.reduce((itemCost, returnedItem) => {
                const costPrice = returnedItem.costPriceAtSale || 0;
                return itemCost + (costPrice * returnedItem.quantity);
            }, 0);
            return totalCost + returnCost;
        }, 0);

        const totalExpensesValue = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        const netSales = totalSalesValue - totalReturnValue;
        const netCOGS = totalCostOfGoodsSold - totalCostOfReturnedGoods;

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
    }, [filteredData]);
    
    const salesMap = useMemo(() => {
        const sortedSales = sales.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return new Map(sortedSales.map((sale, index) => [sale.id, sales.length - index]));
    }, [sales]);

    const exportData = useMemo(() => {
        const { filteredSales, filteredExpenses, filteredReturns } = filteredData;

        const salesWithDetails = filteredSales.map(sale => {
            const totalPokok = sale.items.reduce((acc, item: SaleItem) => {
                const costPrice = typeof item.costPriceAtSale === 'number' ? item.costPriceAtSale : 0;
                return acc + (costPrice * item.quantity);
            }, 0);
            const labaKotor = sale.finalTotal - totalPokok;
            return { ...sale, totalPokok, labaKotor, displayId: salesMap.get(sale.id) };
        });
        
        const totalReturnsValue = filteredReturns.reduce((acc, ret) => acc + ret.totalRefund, 0);
        const totalCostOfReturnedGoods = filteredReturns.reduce((totalCost, ret) => {
            const returnCost = ret.items.reduce((itemCost, returnedItem) => {
                const costPrice = returnedItem.costPriceAtSale || 0;
                return itemCost + (costPrice * returnedItem.quantity);
            }, 0);
            return totalCost + returnCost;
        }, 0);

        const totalSubTotal = salesWithDetails.reduce((acc, sale) => acc + sale.subtotal, 0);
        const totalDiscount = salesWithDetails.reduce((acc, sale) => acc + (sale.subtotal * sale.discount / 100), 0);
        const totalPokokBersih = salesWithDetails.reduce((acc, sale) => acc + sale.totalPokok, 0) - totalCostOfReturnedGoods;
        const totalPengeluaran = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
        
        const penjualanBersih = totalSubTotal - totalDiscount - totalReturnsValue;
        const labaKotor = penjualanBersih - totalPokokBersih;
        const labaBersih = labaKotor - totalPengeluaran;
        
        return {
            salesWithDetails,
            filteredExpenses,
            filteredReturns,
            summary: {
                totalSubTotal,
                totalDiscount,
                totalReturnsValue,
                penjualanBersih,
                totalPokokBersih,
                labaKotor,
                totalPengeluaran,
                labaBersih
            }
        };
    }, [filteredData, salesMap]);


    const handleExportCSV = () => {
        const { salesWithDetails, filteredExpenses, filteredReturns, summary } = exportData;
        const { from, to } = date || {};
        const dateRangeStr = from && to ? `${format(from, 'dd-MM-yyyy')}_-_${format(to, 'dd-MM-yyyy')}` : 'semua_waktu';
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `Laporan Laba Rugi - Periode: ${dateRangeStr.replace(/_/g, ' ')}\n\n`;

        // Summary
        csvContent += "Ringkasan Laporan\n";
        csvContent += "Keterangan,Jumlah\n";
        csvContent += `Penjualan Bersih (Setelah Retur & Diskon),${summary.penjualanBersih}\n`;
        csvContent += `Total Pokok (HPP) Bersih,${summary.totalPokokBersih}\n`;
        csvContent += `Laba Kotor,${summary.labaKotor}\n`;
        csvContent += `Total Pengeluaran,-${summary.totalPengeluaran}\n`;
        csvContent += `LABA BERSIH,${summary.labaBersih}\n\n`;

        // Sales Details
        csvContent += "Rincian Penjualan\n";
        csvContent += "Tanggal,ID Transaksi,Item,Qty,Harga Satuan,Total,Diskon (%),Total Akhir,HPP,Laba Kotor\n";
        salesWithDetails.forEach(sale => {
            sale.items.forEach((item, index) => {
                const row = [
                    index === 0 ? format(new Date(sale.date), 'dd/MM/yyyy') : '',
                    index === 0 ? `trx ${String(sale.displayId || sale.id).padStart(4, '0')}` : '',
                    item.product.name,
                    item.quantity,
                    item.price,
                    item.quantity * item.price,
                    index === 0 ? sale.discount : '',
                    index === 0 ? sale.finalTotal : '',
                    item.costPriceAtSale * item.quantity,
                    ''
                ].join(',');
                csvContent += row + '\n';
            });
             const summaryRow = [
                '', '', '', '', '', 'Total Transaksi:', sale.subtotal, '', 'Total HPP:', sale.totalPokok, 'Laba Transaksi:', sale.labaKotor
            ].join(',');
            csvContent += summaryRow + '\n';
        });
        csvContent += "\n";

        // Returns Details
        csvContent += "Rincian Retur\n";
        csvContent += "Tanggal,ID Transaksi Asal,Item,Qty,Total Refund\n";
        filteredReturns.forEach(ret => {
            ret.items.forEach(item => {
                const row = [
                    format(new Date(ret.date), 'dd/MM/yyyy'),
                    `trx ${salesMap.has(ret.saleId) ? String(salesMap.get(ret.saleId)).padStart(4, '0') : `...${ret.saleId.slice(-6)}`}`,
                    item.productName,
                    item.quantity,
                    item.priceAtSale * item.quantity
                ].join(',');
                 csvContent += row + '\n';
            });
        });
        csvContent += "\n";

        // Expenses Details
        csvContent += "Rincian Pengeluaran\n";
        csvContent += "Tanggal,Kategori,Pengeluaran,Jumlah\n";
        filteredExpenses.forEach(exp => {
            const row = [
                format(new Date(exp.date), 'dd/MM/yyyy'),
                exp.category,
                exp.name,
                exp.amount
            ].join(',');
            csvContent += row + '\n';
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `laporan_arus_kas_${dateRangeStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: "Ekspor Berhasil", description: "Laporan CSV sedang diunduh."});
    };
    

    const kpiCards = [
        { title: 'Penjualan Bersih', value: formatCurrency(financialSummary.totalSales), icon: TrendingUp, color: 'text-green-500', view: 'penjualan' as View | undefined },
        { title: 'Total Modal (HPP)', value: formatCurrency(financialSummary.totalCostOfGoods), icon: ShoppingCart, color: 'text-blue-500', view: undefined },
        { title: 'Total Pengeluaran', value: formatCurrency(financialSummary.totalExpenses), icon: Wallet, color: 'text-orange-500', view: 'pengeluaran' as View | undefined },
        { title: 'Total Retur', value: formatCurrency(financialSummary.totalReturns), icon: Undo2, color: 'text-yellow-500', view: 'retur' as View | undefined },
        { title: 'Laba Kotor', value: formatCurrency(financialSummary.grossProfit), icon: DollarSign, color: 'text-primary', view: undefined },
        { title: 'Laba Bersih', value: formatCurrency(financialSummary.netProfit), icon: financialSummary.netProfit >= 0 ? TrendingUp : TrendingDown, color: financialSummary.netProfit >= 0 ? 'text-green-600' : 'text-destructive', view: undefined },
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
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <Download className="mr-2 h-4 w-4" />
                            Ekspor CSV
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Pratinjau Laporan</DialogTitle>
                            <DialogDescription>
                                Ini adalah ringkasan laporan untuk periode <span className="font-semibold">{date?.from && date.to ? `${format(date.from, "d MMM yyyy")} - ${format(date.to, "d MMM yyyy")}` : 'yang dipilih'}</span>. File CSV akan berisi rincian lengkap.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Penjualan Bersih</span>
                                <span className="font-medium">{formatCurrency(exportData.summary.penjualanBersih)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Total Pokok (HPP)</span>
                                <span className="font-medium">{formatCurrency(exportData.summary.totalPokokBersih)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center text-sm font-semibold">
                                <span>Laba Kotor</span>
                                <span>{formatCurrency(exportData.summary.labaKotor)}</span>
                            </div>
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Total Pengeluaran</span>
                                <span className="font-medium text-destructive">-{formatCurrency(exportData.summary.totalPengeluaran)}</span>
                            </div>
                            <Separator />
                             <div className="flex justify-between items-center text-base font-bold">
                                <span>LABA BERSIH</span>
                                <span className={exportData.summary.labaBersih >= 0 ? 'text-green-600' : 'text-destructive'}>{formatCurrency(exportData.summary.labaBersih)}</span>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Batal</Button>
                            </DialogClose>
                            <DialogClose asChild>
                                <Button onClick={handleExportCSV}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Unduh CSV
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
            <CardTitle>Detail Arus Kas Harian</CardTitle>
            <CardDescription>Visualisasi penjualan, laba, dan pengeluaran harian dalam rentang waktu yang dipilih.</CardDescription>
        </CardHeader>
        <CardContent>
            {dailyChartData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${Math.round(value/1000)}k`} />
                        <Tooltip
                            contentStyle={{
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                            }}
                            formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="Penjualan Bersih" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                        <Line type="monotone" dataKey="Laba Bersih" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                        <Line type="monotone" dataKey="Pengeluaran" stroke="hsl(var(--chart-5))" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-60 flex items-center justify-center bg-muted/50 rounded-md">
                    <p className="text-muted-foreground">Tidak ada data untuk ditampilkan pada rentang tanggal ini.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LaporanPage;
