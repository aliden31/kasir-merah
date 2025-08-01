

'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Expense, Settings, UserRole } from '@/lib/types';
import { PlusCircle, Calendar as CalendarIcon, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getExpenses, addExpense, getSettings, updateExpense } from '@/lib/data-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const ExpenseChart = ({ expenses }: { expenses: Expense[] }) => {
    const expensesByCategory = expenses.reduce((acc, expense) => {
        const key = expense.name || expense.category;
        acc[key] = (acc[key] || 0) + expense.amount;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

    if (chartData.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Tidak ada data untuk ditampilkan pada rentang tanggal ini.
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                }} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};

export const ExpenseForm = ({ 
    expense,
    onSave, 
    onOpenChange, 
    userRole
}: { 
    expense?: Expense;
    onSave: (data: Omit<Expense, 'id'> | Expense) => Promise<void>, 
    onOpenChange: (open: boolean) => void, 
    userRole: UserRole,
}) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<Settings | null>(null);
    
    useEffect(() => {
        const fetchFormSettings = async () => {
            try {
                const settingsData = await getSettings();
                setSettings(settingsData);
            } catch (e) {
                console.error("Failed to fetch settings for expense form", e);
            }
        };
        fetchFormSettings();

        if (expense) {
            setName(expense.name);
            setAmount(expense.amount);
            setCategory(expense.category);
            setDate(new Date(expense.date));
        } else {
            setName('');
            setAmount('');
            setCategory('');
            setDate(new Date());
        }
    }, [expense]);

    const handleSubmit = async () => {
        if (amount === '' || amount <= 0 || !category || !name) {
            return;
        }
        
        setIsSaving(true);
        const expenseData: Omit<Expense, 'id'> = {
            name: name,
            amount: Number(amount),
            category,
            date,
        };

        if (expense?.id) {
            await onSave({ ...expenseData, id: expense.id });
        } else {
            await onSave(expenseData);
        }

        onOpenChange(false);
        setIsSaving(false);
    }
    
    const isSaveDisabled = isSaving || !settings || amount === '' || amount <= 0 || !category || !name;
    
    if (!settings) {
        return <DialogContent><div>Memuat kategori...</div></DialogContent>
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{expense ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}</DialogTitle>
            </DialogHeader>
             <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">Kategori</Label>
                    <Select onValueChange={(value) => setCategory(value)} value={category}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            {(settings.expenseCategories || []).map(cat => (
                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Deskripsi</Label>
                    <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="col-span-3"
                        placeholder="Deskripsi pengeluaran"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">Jumlah</Label>
                    <Input 
                        id="amount" 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                        className="col-span-3"
                        placeholder="0"
                     />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">Tanggal</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className="col-span-3 justify-start text-left font-normal"
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(date, "PPP", { locale: id })}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isSaving}>Batal</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={isSaveDisabled}>{isSaving ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
        </DialogContent>
    )
}

interface PengeluaranPageProps {
    userRole: UserRole;
}

const PengeluaranPage: FC<PengeluaranPageProps> = React.memo(({ userRole }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const { toast } = useToast();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });

  const fetchInitialData = async () => {
    setLoading(true);
    try {
        const expensesData = await getExpenses();
        setExpenses(expensesData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
        toast({ title: "Error", description: "Gagal memuat data.", variant: "destructive"});
        console.error(error);
    } finally {
        setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  const filteredExpenses = useMemo(() => {
    if (!date?.from || !date.to) return expenses;
    const toDate = endOfDay(date.to);
    const interval = { start: startOfDay(date.from), end: toDate };
    return expenses.filter(expense => isWithinInterval(new Date(expense.date), interval));
  }, [expenses, date]);

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'> | Expense) => {
    try {
        if ('id' in expenseData) {
            await updateExpense(expenseData.id, expenseData, userRole);
            toast({ title: "Pengeluaran Diperbarui", description: `Pengeluaran telah berhasil diperbarui.` });
        } else {
            await addExpense(expenseData, userRole);
            toast({ title: "Pengeluaran Disimpan", description: `Pengeluaran telah berhasil disimpan.` });
        }
        await fetchInitialData();
    } catch(error) {
        toast({ title: "Error", description: "Gagal menyimpan pengeluaran.", variant: "destructive" });
        console.error(error);
    }
  }

  const handleOpenForm = (expense?: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  }

  if (loading) {
    return <div>Memuat data pengeluaran...</div>;
  }
    
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold">Manajemen Pengeluaran</h1>
            <p className="text-muted-foreground">Catat dan lihat semua pengeluaran toko Anda.</p>
        </div>
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className="w-full sm:w-[260px] justify-start text-left font-normal"
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
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setFormOpen(isOpen); if (!isOpen) setEditingExpense(undefined); }}>
                <DialogTrigger asChild>
                    <Button onClick={() => handleOpenForm()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Catat
                    </Button>
                </DialogTrigger>
                <ExpenseForm 
                    expense={editingExpense} 
                    onSave={handleSaveExpense} 
                    onOpenChange={setFormOpen} 
                    userRole={userRole}
                />
            </Dialog>
        </div>
      </div>

      <Tabs defaultValue="riwayat">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="riwayat">Riwayat Pengeluaran</TabsTrigger>
          <TabsTrigger value="diagram">Diagram</TabsTrigger>
        </TabsList>
        <TabsContent value="riwayat" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Pengeluaran</CardTitle>
                    <CardDescription>Daftar semua pengeluaran yang telah dicatat dalam rentang waktu terpilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredExpenses.length > 0 ? filteredExpenses.map((expense) => (
                                <TableRow key={expense.id}>
                                <TableCell>{new Date(expense.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</TableCell>
                                <TableCell className="font-medium">{expense.name}</TableCell>
                                <TableCell>
                                    {expense.category}
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(expense)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Belum ada data pengeluaran pada rentang tanggal ini.
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="diagram" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Diagram Pengeluaran</CardTitle>
                    <CardDescription>Visualisasi pengeluaran berdasarkan kategori dalam rentang waktu terpilih.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ExpenseChart expenses={filteredExpenses} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

PengeluaranPage.displayName = 'PengeluaranPage';
export default PengeluaranPage;
