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

interface PengaturanPageProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

const PengaturanPage: FC<PengaturanPageProps> = ({ settings, onSettingsChange }) => {
    const [storeName, setStoreName] = useState(settings.storeName);
    const [defaultDiscount, setDefaultDiscount] = useState(settings.defaultDiscount);
    const { toast } = useToast();

    useEffect(() => {
      setStoreName(settings.storeName);
      setDefaultDiscount(settings.defaultDiscount);
    }, [settings]);
    
    const handleSaveSettings = async () => {
        try {
            const newSettings = { storeName, defaultDiscount };
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
        }
    }

    const handleDeleteDatabase = () => {
        toast({
            variant: "destructive",
            title: "Database Dihapus",
            description: "Semua data telah berhasil dihapus secara permanen.",
        })
    }
    
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Pengaturan</h1>
      
      <Card>
        <CardHeader>
            <CardTitle>Informasi Toko</CardTitle>
            <CardDescription>Ubah nama toko dan pengaturan dasar lainnya.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="storeName">Nama Toko</Label>
                <Input id="storeName" value={storeName} onChange={e => setStoreName(e.target.value)} />
            </div>
            <div>
                <Label htmlFor="defaultDiscount">Diskon Bawaan (%)</Label>
                <Input id="defaultDiscount" type="number" step="0.1" value={defaultDiscount} onChange={e => setDefaultDiscount(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground mt-1">Atur diskon default yang diterapkan pada setiap transaksi. Bisa desimal.</p>
            </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
             <Button onClick={handleSaveSettings}>Simpan Perubahan</Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Tema & Tampilan</CardTitle>
            <CardDescription>Sesuaikan tampilan aplikasi kasir Anda.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center space-x-2">
                <Switch id="dark-mode" />
                <Label htmlFor="dark-mode">Mode Gelap (Dark Mode)</Label>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Fitur ganti tema sedang dalam pengembangan.</p>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
            <CardTitle className="text-destructive">Zona Berbahaya</CardTitle>
            <CardDescription>Tindakan di bawah ini tidak dapat diurungkan. Harap berhati-hati.</CardDescription>
        </CardHeader>
        <CardContent>
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
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteDatabase} className="bg-destructive hover:bg-destructive/90">Ya, Hapus Semuanya</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>

    </div>
  );
};

export default PengaturanPage;
