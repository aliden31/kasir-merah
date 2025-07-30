
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
import { Settings, Category } from '@/lib/types';
import { saveSettings } from '@/lib/data-service';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PengaturanPageProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

const PengaturanPage: FC<PengaturanPageProps> = ({ settings, onSettingsChange }) => {
    const [localSettings, setLocalSettings] = useState<Settings>(settings);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newSubcategory, setNewSubcategory] = useState<{ [key: string]: string }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
      setLocalSettings(settings);
    }, [settings]);
    
    const handleSaveSettings = async (updatedSettings?: Settings) => {
        const settingsToSave = updatedSettings || localSettings;
        setIsSaving(true);
        try {
            await saveSettings(settingsToSave);
            onSettingsChange(settingsToSave);
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

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        const newCategory: Category = {
            id: `cat-${Date.now()}`,
            name: newCategoryName.trim(),
            subcategories: []
        };
        const updatedCategories = [...(localSettings.categories || []), newCategory];
        const updatedSettings = { ...localSettings, categories: updatedCategories };
        setLocalSettings(updatedSettings);
        handleSaveSettings(updatedSettings);
        setNewCategoryName("");
    }
    
    const handleDeleteCategory = (categoryId: string) => {
        const updatedCategories = (localSettings.categories || []).filter(c => c.id !== categoryId);
        const updatedSettings = { ...localSettings, categories: updatedCategories };
        setLocalSettings(updatedSettings);
        handleSaveSettings(updatedSettings);
    }

    const handleAddSubcategory = (categoryId: string) => {
        const subcategoryName = newSubcategory[categoryId]?.trim();
        if (!subcategoryName) return;
        const updatedCategories = (localSettings.categories || []).map(c => {
            if (c.id === categoryId) {
                return { ...c, subcategories: [...c.subcategories, subcategoryName] };
            }
            return c;
        });
        const updatedSettings = { ...localSettings, categories: updatedCategories };
        setLocalSettings(updatedSettings);
        handleSaveSettings(updatedSettings);
        setNewSubcategory({ ...newSubcategory, [categoryId]: "" });
    }

    const handleDeleteSubcategory = (categoryId: string, subcategoryName: string) => {
        const updatedCategories = (localSettings.categories || []).map(c => {
            if (c.id === categoryId) {
                return { ...c, subcategories: c.subcategories.filter(s => s !== subcategoryName) };
            }
            return c;
        });
        const updatedSettings = { ...localSettings, categories: updatedCategories };
        setLocalSettings(updatedSettings);
        handleSaveSettings(updatedSettings);
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

    const updateLocalSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setLocalSettings(prev => ({ ...prev, [key]: value }));
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
                    <RadioGroup 
                        value={localSettings.theme} 
                        onValueChange={(value) => updateLocalSetting('theme', value as 'default' | 'colorful')}
                    >
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
                 <Button onClick={() => handleSaveSettings()} disabled={isSaving}>
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
                    <Input id="storeName" value={localSettings.storeName} onChange={e => updateLocalSetting('storeName', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="defaultDiscount">Diskon Bawaan (%)</Label>
                    <Input id="defaultDiscount" type="number" step="0.1" value={localSettings.defaultDiscount} onChange={e => updateLocalSetting('defaultDiscount', Number(e.target.value))} />
                    <p className="text-xs text-muted-foreground mt-1">Atur diskon default yang diterapkan pada setiap transaksi.</p>
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                 <Button onClick={() => handleSaveSettings()} disabled={isSaving}>
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
                    <Switch id="sync-cost-price" checked={localSettings.syncCostPrice} onCheckedChange={value => updateLocalSetting('syncCostPrice', value)} />
                    <Label htmlFor="sync-cost-price">Sinkronisasi Harga Modal</Label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Jika aktif, harga modal saat ini akan dicatat pada setiap penjualan baru untuk perhitungan laba yang akurat.</p>
            </CardContent>
             <CardFooter className="border-t px-6 py-4">
                 <Button onClick={() => handleSaveSettings()} disabled={isSaving}>
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
            <h2 className="text-lg font-semibold">Kategori Produk</h2>
            <p className="text-sm text-muted-foreground">Kelola kategori dan sub-kategori untuk produk Anda.</p>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Kategori</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Accordion type="multiple" className="w-full">
                            {(localSettings.categories || []).map((cat) => (
                                <AccordionItem value={cat.id} key={cat.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{cat.name}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="pl-4 space-y-2">
                                            <Label className="text-xs text-muted-foreground">Sub-kategori</Label>
                                            {cat.subcategories.length > 0 ? (
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {cat.subcategories.map((sub, index) => (
                                                        <li key={index} className="flex items-center justify-between">
                                                            <span>{sub}</span>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:bg-destructive/10" onClick={() => handleDeleteSubcategory(cat.id, sub)}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">Belum ada sub-kategori.</p>
                                            )}
                                            <div className="flex items-center gap-2 pt-2">
                                                <Input 
                                                    placeholder="Nama sub-kategori baru" 
                                                    className="h-8" 
                                                    value={newSubcategory[cat.id] || ""}
                                                    onChange={e => setNewSubcategory({ ...newSubcategory, [cat.id]: e.target.value })}
                                                />
                                                <Button size="sm" onClick={() => handleAddSubcategory(cat.id)}>Tambah</Button>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        <div className="flex items-center gap-2 pt-4">
                            <Input 
                                placeholder="Nama kategori baru"
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                            />
                            <Button onClick={handleAddCategory}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kategori
                            </Button>
                        </div>
                    </div>
                </CardContent>
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
