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
import { Textarea } from '@/components/ui/textarea';
import { placeholderReturns } from '@/lib/placeholder-data';
import type { Return } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ReturnForm = ({ onSave, onOpenChange }: { onSave: (item: Return) => void, onOpenChange: (open: boolean) => void }) => {
    const [saleId, setSaleId] = useState('');
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('');
    
    const handleSubmit = () => {
        const newReturn: Return = {
            id: `ret-${Date.now()}`,
            saleId,
            productName,
            quantity,
            reason,
            date: new Date(),
        };
        onSave(newReturn);
        onOpenChange(false);
    }
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Tambah Retur Baru</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="saleId" className="text-right">ID Transaksi</Label>
                    <Input id="saleId" value={saleId} onChange={(e) => setSaleId(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="productName" className="text-right">Nama Produk</Label>
                    <Input id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantity" className="text-right">Jumlah</Label>
                    <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reason" className="text-right">Alasan</Label>
                    <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">Batal</Button>
                </DialogClose>
                <Button onClick={handleSubmit}>Simpan Retur</Button>
            </DialogFooter>
        </DialogContent>
    )
}

const ReturPage: FC = () => {
  const [returns, setReturns] = useState<Return[]>(placeholderReturns);
  const [isFormOpen, setFormOpen] = useState(false);
  const { toast } = useToast();
  
  const handleSaveReturn = (item: Return) => {
    setReturns(prev => [...prev, item]);
    toast({
        title: "Retur Disimpan",
        description: "Data retur baru telah berhasil disimpan.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Retur</h1>
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Catat Retur
                </Button>
            </DialogTrigger>
            <ReturnForm onSave={handleSaveReturn} onOpenChange={setFormOpen} />
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>ID Transaksi</TableHead>
            <TableHead>Nama Produk</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
            <TableHead>Alasan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returns.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.date.toLocaleDateString('id-ID')}</TableCell>
              <TableCell>{item.saleId}</TableCell>
              <TableCell className="font-medium">{item.productName}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell>{item.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ReturPage;
