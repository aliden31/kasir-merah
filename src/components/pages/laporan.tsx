
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    const [isExportPreviewOpen, setIsExportPreviewOpen] = useState(false);
    const [exportData, setExportData] = useState<string | null>(null);
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
        
        const filteredSales = sales.filter(sale => isWithinInterval(sale.date, interval));
        const filteredExpenses = expenses.filter(expense => isWithinInterval(expense.date, interval));
        const filteredReturns = returns.filter(ret => isWithinInterval(ret.date, interval));

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

            const daySales = filteredSales.filter(s => isWithinInterval(s.date, { start: dayStart, end: dayEnd }));
            const dayExpenses = filteredExpenses.filter(e => isWithinInterval(e.date, { start: dayStart, end: dayEnd }));
            const dayReturns = filteredReturns.filter(r => isWithinInterval(r.date, { start: dayStart, end: dayEnd }));

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

    const exportPreviewData = useMemo(() => {
        const { filteredSales, filteredExpenses, filteredReturns } = filteredData;

        const salesWithDetails = filteredSales.map(sale => {
            const totalPokok = sale.items.reduce((acc, item: SaleItem) => {
                const costPrice = typeof item.costPriceAtSale === 'number' ? item.costPriceAtSale : 0;
                return acc + (costPrice * item.quantity);
            }, 0);
            const labaKotor = sale.finalTotal - totalPokok;
            return { ...sale, totalPokok, labaKotor };
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

    const prepareExport = () => {
        const { salesWithDetails, filteredExpenses, filteredReturns, summary } = exportPreviewData;
        const round = (num: number) => Math.round(num);

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "LAPORAN LABA RUGI\n\n";

        csvContent += "No Transaksi,Tanggal,Dept,Kode Pel,Nama Pelanggan,Sub Total,Total Pokok,Laba Kotor,Biaya Msk Total (+) Diskon,Biaya Lain,Laba Jual\n";
        salesWithDetails.forEach(sale => {
            const row = [
                `trx-${String(salesMap.get(sale.id)).padStart(4, '0')}`,
                format(sale.date, "yyyy-MM-dd"),
                "UTM",
                "PL0001",
                "PELANGGAN",
                round(sale.subtotal),
                round(sale.totalPokok),
                round(sale.labaKotor),
                round(sale.subtotal * sale.discount / 100),
                0,
                round(sale.finalTotal)
            ].join(",");
            csvContent += row + "\n";
        });
        csvContent += "\n";
        
        csvContent += "DAFTAR RETUR\n";
        csvContent += "Tanggal Retur,ID Transaksi Asal,Alasan,Total Refund\n";
        filteredReturns.forEach(ret => {
            const row = [
                format(ret.date, "yyyy-MM-dd"),
                `trx-${salesMap.has(ret.saleId) ? String(salesMap.get(ret.saleId)).padStart(4, '0') : `...${ret.saleId.slice(-6)}`}`,
                `"${ret.reason.replace(/"/g, '""')}"`,
                round(ret.totalRefund)
            ].join(",");
            csvContent += row + "\n";
        });
        csvContent += "\n";

        csvContent += "DAFTAR PENGELUARAN\n";
        csvContent += "Tanggal Pengeluaran,Kategori,Deskripsi,Jumlah\n";
        filteredExpenses.forEach(expense => {
            const row = [
                format(expense.date, "yyyy-MM-dd"),
                expense.category,
                `"${(expense.subcategory || expense.category).replace(/"/g, '""')}"`,
                round(expense.amount)
            ].join(",");
            csvContent += row + "\n";
        });
        csvContent += "\n";

        csvContent += "TOTAL KESELURUHAN\n";
        csvContent += `Penjualan Bersih (Setelah Retur & Diskon):,${round(summary.penjualanBersih)}\n`;
        csvContent += `Total Pokok (HPP) Bersih:,${round(summary.totalPokokBersih)}\n`;
        csvContent += `Laba Kotor (Setelah Retur & HPP):,${round(summary.labaKotor)}\n`;
        csvContent += `Total Pengeluaran:,-${round(summary.totalPengeluaran)}\n`;
        csvContent += `Laba Bersih (Setelah Semua Biaya):,${round(summary.labaBersih)}\n`;

        setExportData(csvContent);
        setIsExportPreviewOpen(true);
    };

    const handleDownload = () => {
        if (!exportData) return;
        const encodedUri = encodeURI(exportData);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "laporan_laba_rugi.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportPreviewOpen(false);
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
                <Button onClick={prepareExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Ekspor
                </Button>
            </div>
        </div>
        
      <Dialog open={isExportPreviewOpen} onOpenChange={setIsExportPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pratinjau Ekspor Laporan</DialogTitle>
            <DialogDescription>
              Berikut adalah ringkasan dari data yang akan diekspor. Angka dalam file CSV tidak akan diformat.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 p-1">
              <Card>
                <CardHeader>
                  <CardTitle>Ringkasan Laba Rugi</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Penjualan Bersih (Setelah Retur & Diskon)</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(exportPreviewData.summary.penjualanBersih)}</TableCell>
                      </TableRow>
                       <TableRow>
                        <TableCell>Total Pokok (HPP) Bersih</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(exportPreviewData.summary.totalPokokBersih)}</TableCell>
                      </TableRow>
                       <TableRow>
                        <TableCell className="font-semibold">Laba Kotor</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(exportPreviewData.summary.labaKotor)}</TableCell>
                      </TableRow>
                       <TableRow>
                        <TableCell>Total Pengeluaran</TableCell>
                        <TableCell className="text-right font-medium text-destructive">-{formatCurrency(exportPreviewData.summary.totalPengeluaran)}</TableCell>
                      </TableRow>
                       <TableRow className="bg-muted/50">
                        <TableCell className="font-bold text-base">Laba Bersih (Setelah Semua Biaya)</TableCell>
                        <TableCell className={`text-right font-bold text-base ${exportPreviewData.summary.labaBersih >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {formatCurrency(exportPreviewData.summary.labaBersih)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsExportPreviewOpen(false)}>Batal</Button>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Unduh CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${value/1000}k`} />
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

      