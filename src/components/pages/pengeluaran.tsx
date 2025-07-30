'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Expense } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getExpenses, addExpense } from '@/lib/data-service';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

const ExpenseChart = ({ expenses }: { expenses: Expense[] }) => {
    const expensesByCategory = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Diagram Pengeluaran per Kategori</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>
    );
};

const ExpenseForm = ({ onSave, onOpenChange }: { onSave: (expense: Omit<Expense, 'id'>) => void, onOpenChange: (open: boolean) => void }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState(0);
    const [category, setCategory] = useState<'Operasional' | 'Gaji' | 'Pemasaran' | 'Lainnya'>('Lainnya');

    const handleSubmit = () => {
        const newExpense: Omit<Expense, 'id'> = {
            name,
            amount,
            category,
            date: new Date(),
        };
        onSave(newExpense);
        onOpenChange(false);
    }
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Catat Pengeluaran Baru</DialogTitle>
            </DialogHeader>
             <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nama</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">Kategori</Label>
                    <Select onValueChange={(value) => setCategory(value as any)} defaultValue={category}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Operasional">Operasional</SelectItem>
                            <SelectItem value="Gaji">Gaji</SelectItem>
                            <SelectItem value="Pemasaran">Pemasaran</SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">Jumlah</Label>
                    <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">Batal</Button>
                </DialogClose>
                <Button onClick={handleSubmit}>Simpan</Button>
            </DialogFooter>
        </DialogContent>
    )
}

const PengeluaranPage: FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchExpenses = async () => {
        try {
            const expensesData = await getExpenses();
            setExpenses(expensesData);
        } catch (error) {
            toast({ title: "Error", description: "Gagal memuat data pengeluaran.", variant: "destructive"});
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchExpenses();
  }, [toast]);

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
        const newExpense = await addExpense(expenseData);
        setExpenses(prev => [...prev, newExpense]);
        toast({
            title: "Pengeluaran Disimpan",
            description: `Pengeluaran "${newExpense.name}" telah berhasil disimpan.`,
        });
    } catch(error) {
        toast({ title: "Error", description: "Gagal menyimpan pengeluaran.", variant: "destructive" });
        console.error(error);
    }
  }

  if (loading) {
    return <div>Memuat data pengeluaran...</div>;
  }
    
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Pengeluaran</h1>
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Catat Pengeluaran
                </Button>
            </DialogTrigger>
            <ExpenseForm onSave={handleSaveExpense} onOpenChange={setFormOpen}/>
        </Dialog>
      </div>

      <Tabs defaultValue="riwayat">
        <TabsList>
          <TabsTrigger value="riwayat">Riwayat Pengeluaran</TabsTrigger>
          <TabsTrigger value="diagram">Diagram Pengeluaran</TabsTrigger>
        </TabsList>
        <TabsContent value="riwayat" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Pengeluaran</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.date.toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="font-medium">{expense.name}</TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="diagram" className="mt-4">
            <ExpenseChart expenses={expenses} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PengeluaranPage;
