'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { useToast } from '@/hooks/use-toast';
import { Settings } from '@/lib/types';
import { saveSettings } from '@/lib/data-service';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface PengaturanPageProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

const PengaturanPage: FC<PengaturanPageProps> = ({ settings, onSettingsChange }) => {
    const [storeName, setStoreName] = useState(settings.storeName);
    const [defaultDiscount, setDefaultDiscount] = useState(settings.defaultDiscount);
    const [syncCostPrice, setSyncCostPrice] = useState(settings.syncCostPrice);
    const [theme, setTheme] = useState(settings.theme || 'default');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
      setStoreName(settings.storeName);
      setDefaultDiscount(settings.defaultDiscount);
      setSyncCostPrice(settings.syncCostPrice);
      setTheme(settings.theme || 'default');
    }, [settings]);
    
    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const newSettings: Settings = { storeName, defaultDiscount, syncCostPrice, theme };
            await saveSettings(newSettings);
            onSettingsChange(newSettings);
            toast({
                title: "Pengaturan Disimpan",
                description: "Pengaturan toko telah berhasil diperbarui.",
            });
        } catch (error) {
            toast({
                title: "Gagal Menyimpan",
                description: "Terjadi kesalahan saat menyimpan pengaturan.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    }

    const handleDeleteDatabase = () => {
        setIsDeleting(true);
        // Simulate a database deletion
        setTimeout(() => {
            toast({
                variant: "destructive",
                title: "Database Dihapus",
                description: "Semua data telah berhasil dihapus secara permanen.",
            });
            setIsDeleting(false);
        }, 2000);
    }
    
  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground">
          Kelola pengaturan toko dan preferensi aplikasi Anda.
        </p>
      </div>
      <Separator />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold">Tampilan</h2>
          <p className="text-sm text-muted-foreground">Sesuaikan tampilan visual aplikasi.</p>
        </div>
        <div className="md:col-span-2">
           <Card>
            <CardContent className="pt-6">
                <div className="space-y-2">
                    <Label>Tema</Label>
                    <RadioGroup value={theme} onValueChange={(value) => setTheme(value as 'default' | 'colorful')}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="default" id="theme-default" />
                        <Label htmlFor="theme-default">Default</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="colorful" id="theme-colorful" />
                        <Label htmlFor="theme-colorful">Colorful</Label>
                      </div>
                    </RadioGroup>
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                 <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan Perubahan
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <Separator />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold">Informasi Toko</h2>
          <p className="text-sm text-muted-foreground">Ubah nama toko dan pengaturan dasar lainnya.</p>
        </div>
        <div className="md:col-span-2">
           <Card>
            <CardContent className="pt-6 space-y-4">
                <div>
                    <Label htmlFor="storeName">Nama Toko</Label>
                    <Input id="storeName" value={storeName} onChange={e => setStoreName(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="defaultDiscount">Diskon Bawaan (%)</Label>
                    <Input id="defaultDiscount" type="number" step="0.1" value={defaultDiscount} onChange={e => setDefaultDiscount(Number(e.target.value))} />
                    <p className="text-xs text-muted-foreground mt-1">Atur diskon default yang diterapkan pada setiap transaksi.</p>
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                 <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan Perubahan
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <Separator />
       <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold">Preferensi</h2>
          <p className="text-sm text-muted-foreground">Atur perilaku aplikasi.</p>
        </div>
        <div className="md:col-span-2">
           <Card>
            <CardContent className="pt-6">
                 <div className="flex items-center space-x-2">
                    <Switch id="sync-cost-price" checked={syncCostPrice} onCheckedChange={setSyncCostPrice} />
                    <Label htmlFor="sync-cost-price">Sinkronisasi Harga Modal</Label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Jika aktif, harga modal saat ini akan dicatat pada setiap penjualan baru untuk perhitungan laba yang akurat.</p>
            </CardContent>
             <CardFooter className="border-t px-6 py-4">
                 <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan Perubahan
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
       <Separator />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold text-destructive">Zona Berbahaya</h2>
          <p className="text-sm text-muted-foreground">Tindakan di bawah ini tidak dapat diurungkan. Harap berhati-hati.</p>
        </div>
        <div className="md:col-span-2">
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle>Hapus Data</CardTitle>
                    <CardDescription>Tindakan ini akan menghapus semua data Anda secara permanen. Harap berhati-hati karena tindakan ini tidak dapat dibatalkan.</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-start">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Hapus Seluruh Database</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Apakah Anda benar-benar yakin?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tindakan ini tidak dapat diurungkan. Ini akan menghapus semua data produk, penjualan, pengeluaran, dan retur Anda secara permanen.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteDatabase} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ya, Hapus Semuanya
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default PengaturanPage;
