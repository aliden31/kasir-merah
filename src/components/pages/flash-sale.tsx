'use client';

import type { FC } from 'react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { placeholderFlashSales, placeholderProducts } from '@/lib/placeholder-data';
import type { FlashSale } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const FlashSaleForm = ({ onSave, onOpenChange }: { onSave: (sale: FlashSale) => void, onOpenChange: (open: boolean) => void }) => {
    const [productName, setProductName] = useState('');
    const [discountPrice, setDiscountPrice] = useState(0);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const handleSubmit = () => {
        const newSale: FlashSale = {
            id: `fs-${Date.now()}`,
            productName,
            discountPrice,
            startTime: new Date(startTime),
            endTime: new Date(endTime)
        };
        onSave(newSale);
        onOpenChange(false);
    }
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Buat Flash Sale Baru</DialogTitle>
            </DialogHeader>
             <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="productName" className="text-right">Produk</Label>
                    <Select onValueChange={setProductName}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Pilih produk" />
                        </SelectTrigger>
                        <SelectContent>
                            {placeholderProducts.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="discountPrice" className="text-right">Harga Diskon</Label>
                    <Input id="discountPrice" type="number" value={discountPrice} onChange={(e) => setDiscountPrice(Number(e.target.value))} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="startTime" className="text-right">Waktu Mulai</Label>
                    <Input id="startTime" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="endTime" className="text-right">Waktu Selesai</Label>
                    <Input id="endTime" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">Batal</Button>
                </DialogClose>
                <Button onClick={handleSubmit}>Jadwalkan</Button>
            </DialogFooter>
        </DialogContent>
    )
}

const FlashSalePage: FC = () => {
  const [flashSales, setFlashSales] = useState<FlashSale[]>(placeholderFlashSales);
  const [isFormOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  const handleSaveSale = (sale: FlashSale) => {
    setFlashSales(prev => [...prev, sale]);
    toast({
        title: "Flash Sale Dibuat",
        description: `Flash sale untuk ${sale.productName} telah dijadwalkan.`,
    });
  }

  const getStatus = (sale: FlashSale) => {
    const now = new Date();
    if (now < sale.startTime) return <Badge variant="outline">Akan Datang</Badge>;
    if (now >= sale.startTime && now <= sale.endTime) return <Badge className="bg-destructive text-destructive-foreground">Sedang Berlangsung</Badge>;
    return <Badge variant="secondary">Selesai</Badge>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Flash Sale</h1>
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Buat Flash Sale
                </Button>
            </DialogTrigger>
            <FlashSaleForm onSave={handleSaveSale} onOpenChange={setFormOpen}/>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Produk</TableHead>
            <TableHead className="text-right">Harga Diskon</TableHead>
            <TableHead>Waktu Mulai</TableHead>
            <TableHead>Waktu Selesai</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flashSales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell className="font-medium">{sale.productName}</TableCell>
              <TableCell className="text-right">{formatCurrency(sale.discountPrice)}</TableCell>
              <TableCell>{sale.startTime.toLocaleString('id-ID')}</TableCell>
              <TableCell>{sale.endTime.toLocaleString('id-ID')}</TableCell>
              <TableCell className="text-center">{getStatus(sale)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default FlashSalePage;
