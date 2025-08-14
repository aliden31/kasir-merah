
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, Wallet, Download, Undo2, Printer, PlusSquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format, isWithinInterval, startOfDay, eachDayOfInterval, endOfDay } from 'date-fns';
import type { Sale, Expense, Return, SaleItem, ReturnItem, OtherIncome } from '@/lib/types';
import { getSales, getExpenses, getReturns, getOtherIncomes } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
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
  | 'pemasukan-lain'
  | 'laporan'
  | 'flash-sale'
  | 'pengaturan';

interface LaporanPageProps {
  onNavigate: (view: View) => void;
}


const LaporanPage: FC<LaporanPageProps> = React.memo(({ onNavigate }) => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [returns, setReturns] = useState<Return[]>([]);
    const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([]);
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
                const [salesData, expensesData, returnsData, otherIncomesData] = await Promise.all([getSales(), getExpenses(), getReturns(), getOtherIncomes()]);
                setSales(salesData);
                setExpenses(expensesData);
                setReturns(returnsData);
                setOtherIncomes(otherIncomesData);
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
        if (!date?.from || !date.to) return { filteredSales: [], filteredExpenses: [], filteredReturns: [], filteredOtherIncomes: [] };

        const toDate = endOfDay(date.to);
        const interval = { start: startOfDay(date.from), end: toDate };
        
        const filteredSales = sales.filter(sale => isWithinInterval(new Date(sale.date), interval));
        const filteredExpenses = expenses.filter(expense => isWithinInterval(new Date(expense.date), interval));
        const filteredReturns = returns.filter(ret => isWithinInterval(new Date(ret.date), interval));
        const filteredOtherIncomes = otherIncomes.filter(income => isWithinInterval(new Date(income.date), interval));

        return { filteredSales, filteredExpenses, filteredReturns, filteredOtherIncomes };

    }, [sales, expenses, returns, otherIncomes, date]);
    
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
        const { filteredSales, filteredExpenses, filteredReturns, filteredOtherIncomes } = filteredData;
        
        const totalSalesValue = filteredSales.reduce((sum, sale) => sum + sale.finalTotal, 0);
        const totalReturnValue = filteredReturns.reduce((sum, ret) => sum + ret.totalRefund, 0);
        const totalOtherIncomesValue = filteredOtherIncomes.reduce((sum, income) => sum + income.amount, 0);

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

        const grossProfit = netSales - netCOGS + totalOtherIncomesValue;
        const netProfit = grossProfit - totalExpensesValue;
        
        return { 
            totalSales: netSales,
            totalCostOfGoods: netCOGS,
            totalExpenses: totalExpensesValue,
            totalReturns: totalReturnValue,
            totalOtherIncomes: totalOtherIncomesValue,
            grossProfit, 
            netProfit 
        };
    }, [filteredData]);
    
    const salesMap = useMemo(() => {
        const sortedSales = sales.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return new Map(sortedSales.map((sale, index) => [sale.id, index + 1]));
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
        const totalPokokKotor = salesWithDetails.reduce((acc, sale) => acc + sale.totalPokok, 0);
        const totalPengeluaran = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);
        
        const penjualanBersih = totalSubTotal - totalDiscount - totalReturnsValue;
        const totalPokokBersih = totalPokokKotor - totalCostOfReturnedGoods;
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


    const handleExportXLSX = () => {
        const { salesWithDetails, filteredExpenses, filteredReturns, summary } = exportData;
        const { from, to } = date || {};
        const dateRangeStr = from && to ? `${format(from, 'dd-MM-yyyy')} - ${format(to, 'dd-MM-yyyy')}` : 'Semua Waktu';
    
        const wb = XLSX.utils.book_new();
        const numFormat = '#,##0';
    
        // --- DATA PREPARATION ---
        const sheetData: (any)[][] = [];
    
        // Title
        sheetData.push([`Laporan Laba Rugi - Periode: ${dateRangeStr}`]);
        sheetData.push([]); 
    
        // Sales Details Section
        sheetData.push(['Rincian Penjualan']);
        const salesHeader = ['Tanggal', 'ID Transaksi', 'Item', 'Qty', 'Harga Satuan', 'Total', 'Diskon (%)', 'Total Akhir', 'HPP', 'Laba Kotor'];
        sheetData.push(salesHeader);
        salesWithDetails.forEach(sale => {
            sale.items.forEach((item, index) => {
                const costPriceAtSale = item.costPriceAtSale || 0;
                const hpp = costPriceAtSale * item.quantity;
    
                sheetData.push([
                    index === 0 ? format(new Date(sale.date), 'dd/MM/yyyy') : '',
                    index === 0 ? `trx ${String(sale.displayId || sale.id).padStart(4, '0')}` : '',
                    item.product.name,
                    { t: 'n', v: item.quantity },
                    { t: 'n', v: item.price, z: numFormat },
                    { t: 'n', v: item.quantity * item.price, z: numFormat },
                    index === 0 ? { t: 'n', v: sale.discount } : '',
                    index === 0 ? { t: 'n', v: sale.finalTotal, z: numFormat } : '',
                    { t: 'n', v: hpp, z: numFormat },
                    ''
                ]);
            });
            sheetData.push(['', '', '', '', '','Total Transaksi:', { t: 'n', v: sale.subtotal, z: numFormat }, '', { t: 'n', v: sale.finalTotal, z: numFormat }, { t: 'n', v: sale.labaKotor, z: numFormat }]);
        });
        sheetData.push([]); 
    
        // Returns Details Section
        if (filteredReturns.length > 0) {
            sheetData.push(['Rincian Retur']);
            const returnsHeader = ['Tanggal', 'ID Transaksi Asal', 'Item', 'Qty', 'Total Refund'];
            sheetData.push(returnsHeader);
            filteredReturns.forEach(ret => {
                ret.items.forEach(item => {
                    sheetData.push([
                        format(new Date(ret.date), 'dd/MM/yyyy'),
                        `trx ${salesMap.has(ret.saleId) ? String(salesMap.get(ret.saleId)).padStart(4, '0') : `...${ret.saleId.slice(-6)}`}`,
                        item.product.name,
                        { t: 'n', v: item.quantity },
                        { t: 'n', v: item.priceAtSale * item.quantity, z: numFormat }
                    ]);
                });
            });
            sheetData.push([]);
        }
        
        // Expenses Details Section
        if (filteredExpenses.length > 0) {
            sheetData.push(['Rincian Pengeluaran']);
            const expensesHeader = ['Tanggal', 'Kategori', 'Sub-Kategori', 'Deskripsi', 'Jumlah'];
            sheetData.push(expensesHeader);
            filteredExpenses.forEach(exp => {
                sheetData.push([
                    format(new Date(exp.date), 'dd/MM/yyyy'),
                    exp.category,
                    exp.subcategory || '',
                    exp.name,
                    { t: 'n', v: exp.amount, z: numFormat }
                ]);
            });
            sheetData.push([]);
        }
    
        // Summary Section at the bottom
        sheetData.push(['Ringkasan Laporan']);
        sheetData.push(['Keterangan', 'Jumlah']);
        sheetData.push(['Penjualan Bersih (Setelah Retur & Diskon)', { t: 'n', v: summary.penjualanBersih, z: numFormat }]);
        sheetData.push(['Total Modal (HPP) Bersih', { t: 'n', v: summary.totalPokokBersih, z: numFormat }]);
        sheetData.push(['Laba Kotor', { t: 'n', v: summary.labaKotor, z: numFormat }]);
        sheetData.push(['Total Pengeluaran', { t: 'n', v: -summary.totalPengeluaran, z: numFormat }]);
        sheetData.push(['LABA BERSIH', { t: 'n', v: summary.labaBersih, z: numFormat, s: { font: { bold: true } } }]);

        const ws = XLSX.utils.aoa_to_sheet(sheetData, { cellStyles: true });
        
        // Auto-fit columns
        const cols = Object.keys(ws).filter(key => key.match(/[A-Z]+1$/)).map(key => key.replace('1', ''));
        const colWidths = cols.map(col => {
            const cells = Object.keys(ws).filter(key => key.startsWith(col));
            const max = Math.max(...cells.map(cell => (ws[cell].v || '').toString().length));
            return { wch: max + 2 };
        });
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Arus Kas');
    
        const fileName = `laporan_arus_kas_${dateRangeStr.replace(/ /g, '').replace(/-/g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        toast({ title: "Ekspor Berhasil", description: "Laporan XLSX sedang diunduh."});
    };
    

    const kpiCards = [
        { title: 'Penjualan Bersih', value: formatCurrency(financialSummary.totalSales), icon: TrendingUp, color: 'text-green-500', view: 'penjualan' as View | undefined },
        { title: 'Total Modal (HPP)', value: formatCurrency(financialSummary.totalCostOfGoods), icon: ShoppingCart, color: 'text-blue-500', view: undefined },
        { title: 'Pemasukan Lain', value: formatCurrency(financialSummary.totalOtherIncomes), icon: PlusSquare, color: 'text-sky-500', view: 'pemasukan-lain' as View | undefined },
        { title: 'Total Retur', value: formatCurrency(financialSummary.totalReturns), icon: Undo2, color: 'text-yellow-500', view: 'retur' as View | undefined },
        { title: 'Total Pengeluaran', value: formatCurrency(financialSummary.totalExpenses), icon: Wallet, color: 'text-orange-500', view: 'pengeluaran' as View | undefined },
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
                            Ekspor XLSX
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Pratinjau Laporan</DialogTitle>
                            <DialogDescription>
                                Ini adalah ringkasan laporan untuk periode <span className="font-semibold">{date?.from && date.to ? `${format(date.from, "d MMM yyyy")} - ${format(date.to, "d MMM yyyy")}` : 'yang dipilih'}</span>. File XLSX akan berisi rincian lengkap.
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
                                <Button onClick={handleExportXLSX}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Unduh XLSX
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
});

LaporanPage.displayName = 'LaporanPage';
export default LaporanPage;
