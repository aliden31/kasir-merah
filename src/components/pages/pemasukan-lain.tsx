

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OtherIncome, UserRole } from '@/lib/types';
import { PlusCircle, Calendar as CalendarIcon, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getOtherIncomes, addOtherIncome, updateOtherIncome, deleteOtherIncome } from '@/lib/data-service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

export const OtherIncomeForm = ({ 
    income,
    onSave, 
    onOpenChange, 
}: { 
    income?: OtherIncome;
    onSave: (data: Omit<OtherIncome, 'id'> | OtherIncome) => Promise<void>, 
    onOpenChange: (open: boolean) => void, 
}) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [date, setDate] = useState<Date>(new Date());
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (income) {
            setName(income.name);
            setAmount(income.amount);
            setDate(new Date(income.date));
            setNotes(income.notes || '');
        } else {
            setName('');
            setAmount('');
            setDate(new Date());
            setNotes('');
        }
    }, [income]);
    
    const handleSubmit = async () => {
        if (amount === '' || amount <= 0 || !name) {
            return;
        }
        
        setIsSaving(true);
        const incomeData: Omit<OtherIncome, 'id'> = {
            name,
            amount: Number(amount),
            date,
            notes,
        };

        if (income?.id) {
            await onSave({ ...incomeData, id: income.id });
        } else {
            await onSave(incomeData);
        }

        onOpenChange(false);
        setIsSaving(false);
    }
    
    const isSaveDisabled = isSaving || amount === '' || amount <= 0 || !name;

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{income ? 'Edit Pemasukan' : 'Catat Pemasukan Baru'}</DialogTitle>
            </DialogHeader>
             <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                        Deskripsi
                    </Label>
                    <Input 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="col-span-3"
                        placeholder="Deskripsi pemasukan"
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
                 <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="notes" className="text-right pt-2">Catatan</Label>
                    <Textarea 
                        id="notes" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        className="col-span-3"
                        placeholder="Catatan tambahan (opsional)"
                    />
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

interface PemasukanLainPageProps {
    onDataChange: () => void;
    userRole: UserRole;
}

const PemasukanLainPage: FC<PemasukanLainPageProps> = React.memo(({ onDataChange, userRole }) => {
  const [incomes, setIncomes] = useState<OtherIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<OtherIncome | undefined>(undefined);
  const { toast } = useToast();
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });

  const fetchInitialData = async () => {
    setLoading(true);
    try {
        const incomesData = await getOtherIncomes();
        setIncomes(incomesData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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
  
  const filteredIncomes = useMemo(() => {
    if (!date?.from) return incomes;

    const toDate = date.to ? endOfDay(date.to) : endOfDay(date.from);
    const interval = { start: startOfDay(date.from), end: toDate };
    return incomes.filter(income => isWithinInterval(new Date(income.date), interval));
    
  }, [incomes, date]);

  const totalFilteredAmount = useMemo(() => {
    return filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
  }, [filteredIncomes]);


  const handleSaveIncome = async (incomeData: Omit<OtherIncome, 'id'> | OtherIncome) => {
    try {
        if ('id' in incomeData) {
            await updateOtherIncome(incomeData.id, incomeData, userRole);
            toast({ title: "Pemasukan Diperbarui", description: `Pemasukan telah berhasil diperbarui.` });
        } else {
            await addOtherIncome(incomeData, userRole);
            toast({ title: "Pemasukan Disimpan", description: `Pemasukan baru telah berhasil disimpan.` });
        }
        await fetchInitialData();
        onDataChange();
    } catch(error) {
        toast({ title: "Error", description: "Gagal menyimpan pemasukan.", variant: "destructive" });
        console.error(error);
    }
  }

  const handleDeleteIncome = async (income: OtherIncome) => {
    try {
        await deleteOtherIncome(income, userRole);
        toast({ title: "Pemasukan Dihapus", description: `Pemasukan "${income.name}" telah dihapus.` });
        await fetchInitialData();
        onDataChange();
    } catch (error) {
        toast({ title: "Error", description: "Gagal menghapus pemasukan.", variant: "destructive" });
    }
  }

  const handleOpenForm = (income?: OtherIncome) => {
    setEditingIncome(income);
    setFormOpen(true);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-80" />
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-24" />
            </div>
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-48 w-full" />
            </CardContent>
        </Card>
    </div>
    );
  }
    
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold">Pemasukan Lain-lain</h1>
            <p className="text-muted-foreground">Catat semua pemasukan di luar penjualan produk.</p>
        </div>
        <div className="flex items-center gap-2">
            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setFormOpen(isOpen); if (!isOpen) setEditingIncome(undefined); }}>
                <DialogTrigger asChild>
                    <Button onClick={() => handleOpenForm()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Catat Pemasukan
                    </Button>
                </DialogTrigger>
                <OtherIncomeForm
                    income={editingIncome} 
                    onSave={handleSaveIncome} 
                    onOpenChange={setFormOpen}
                />
            </Dialog>
        </div>
      </div>
      
      <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                        <CardTitle>Riwayat Pemasukan</CardTitle>
                        <CardDescription>
                            Ditemukan {filteredIncomes.length} transaksi dengan total <span className="font-semibold text-primary">{formatCurrency(totalFilteredAmount)}</span>.
                        </CardDescription>
                    </div>
                    <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
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
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Deskripsi</TableHead>
                            <TableHead>Catatan</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredIncomes.length > 0 ? filteredIncomes.map((income) => (
                            <TableRow key={income.id}>
                                <TableCell>{new Date(income.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</TableCell>
                                <TableCell className="font-medium">{income.name}</TableCell>
                                <TableCell className="text-muted-foreground">{income.notes}</TableCell>
                                <TableCell className="text-right">{formatCurrency(income.amount)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(income)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Hapus Pemasukan?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Tindakan ini akan menghapus catatan pemasukan "{income.name}" secara permanen. Apakah Anda yakin?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteIncome(income)} className="bg-destructive hover:bg-destructive/90">
                                                    Hapus
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Belum ada data pemasukan pada rentang tanggal ini.
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
});

PemasukanLainPage.displayName = 'PemasukanLainPage';
export default PemasukanLainPage;
