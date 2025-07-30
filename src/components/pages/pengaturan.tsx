
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Settings, ExpenseCategory, SubCategory, UserRole } from '@/lib/types';
import { saveSettings, clearData } from '@/lib/data-service';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PengaturanPageProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  userRole: UserRole;
}

const PengaturanPage: FC<PengaturanPageProps> = React.memo(({ settings, onSettingsChange, userRole }) => {
    const [localSettings, setLocalSettings] = useState<Settings>(settings);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newSubCategoryNames, setNewSubCategoryNames] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [dataToDelete, setDataToDelete] = useState({
        products: false,
        sales: false,
        returns: false,
        expenses: false,
    });
    const { toast } = useToast();

    useEffect(() => {
      setLocalSettings(settings);
    }, [settings]);
    
    const handleSaveSettings = async (updatedSettings?: Settings) => {
        const settingsToSave = updatedSettings || localSettings;
        setIsSaving(true);
        try {
            await saveSettings(settingsToSave, userRole);
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

    const handleAddExpenseCategory = () => {
        if (!newCategoryName.trim()) return;
        const newCategory: ExpenseCategory = {
            id: `exp-cat-${Date.now()}`,
            name: newCategoryName.trim(),
            subcategories: []
        };
        const updatedCategories = [...(localSettings.expenseCategories || []), newCategory];
        const updatedSettings = { ...localSettings, expenseCategories: updatedCategories };
        setLocalSettings(updatedSettings);
        handleSaveSettings(updatedSettings);
        setNewCategoryName("");
    }
    
    const handleDeleteExpenseCategory = (categoryId: string) => {
        const updatedCategories = (localSettings.expenseCategories || []).filter(c => c.id !== categoryId);
        const updatedSettings = { ...localSettings, expenseCategories: updatedCategories };
        setLocalSettings(updatedSettings);
        handleSaveSettings(updatedSettings);
    }
    
    const handleAddSubCategory = (categoryId: string) => {
        const subCategoryName = newSubCategoryNames[categoryId]?.trim();
        if (!subCategoryName) return;

        const newSubCategory: SubCategory = {
            id: `exp-sub-${Date.now()}`,
            name: subCategoryName
        };

        const updatedCategories = (localSettings.expenseCategories || []).map(cat => {
            if (cat.id === categoryId) {
                return {
                    ...cat,
                    subcategories: [...cat.subcategories, newSubCategory]
                };
            }
            return cat;
        });
        
        const updatedSettings = { ...localSettings, expenseCategories: updatedCategories };
        setLocalSettings(updatedSettings);
        handleSaveSettings(updatedSettings);
        setNewSubCategoryNames(prev => ({...prev, [categoryId]: ""}));
    };

    const handleDeleteSubCategory = (categoryId: string, subCategoryId: string) => {
        const updatedCategories = (localSettings.expenseCategories || []).map(cat => {
            if (cat.id === categoryId) {
                return {
                    ...cat,
                    subcategories: cat.subcategories.filter(sub => sub.id !== subCategoryId)
                };
            }
            return cat;
        });
        
        const updatedSettings = { ...localSettings, expenseCategories: updatedCategories };
        setLocalSettings(updatedSettings);
        handleSaveSettings(updatedSettings);
    };

    const handleClearData = async () => {
        setIsDeleting(true);
        try {
            await clearData(dataToDelete, userRole);
            toast({
                title: "Data Dihapus",
                description: "Data yang dipilih telah berhasil dihapus.",
            });
            setDataToDelete({ products: false, sales: false, returns: false, expenses: false });
        } catch (error) {
             toast({
                title: "Gagal Menghapus Data",
                description: "Terjadi kesalahan saat menghapus data.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const isDeleteButtonDisabled = !Object.values(dataToDelete).some(Boolean) || isDeleting;

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
            <h2 className="text-lg font-semibold">Kategori Pengeluaran</h2>
            <p className="text-sm text-muted-foreground">Kelola kategori dan sub-kategori untuk pengeluaran Anda.</p>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Kategori & Sub-Kategori</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {(localSettings.expenseCategories || []).map((cat) => (
                        <AccordionItem value={cat.id} key={cat.id}>
                            <div className="flex items-center justify-between w-full">
                                <AccordionTrigger className="flex-grow hover:no-underline pr-2">
                                    <span>{cat.name}</span>
                                </AccordionTrigger>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDeleteExpenseCategory(cat.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          <AccordionContent>
                            <div className="pl-4 space-y-2">
                               {cat.subcategories.map(sub => (
                                 <div key={sub.id} className="flex items-center justify-between rounded-md border p-2">
                                    <span>{sub.name}</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSubCategory(cat.id, sub.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                 </div>
                               ))}
                               <div className="flex items-center gap-2 pt-2">
                                    <Input 
                                        placeholder="Nama sub-kategori baru"
                                        value={newSubCategoryNames[cat.id] || ""}
                                        onChange={e => setNewSubCategoryNames(prev => ({...prev, [cat.id]: e.target.value}))}
                                        onKeyDown={e => {if (e.key === 'Enter') handleAddSubCategory(cat.id)}}
                                    />
                                    <Button size="sm" onClick={() => handleAddSubCategory(cat.id)}>Tambah</Button>
                               </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>

                     <div className="flex items-center gap-2 pt-4 mt-4 border-t">
                        <Input 
                            placeholder="Nama kategori utama baru"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                             onKeyDown={e => {if (e.key === 'Enter') handleAddExpenseCategory()}}
                        />
                        <Button onClick={handleAddExpenseCategory}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kategori
                        </Button>
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
                    <CardDescription>Pilih data spesifik yang ingin Anda hapus secara permanen. Tindakan ini tidak dapat dibatalkan.</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-start">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="destructive">Hapus Data Tertentu</Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Hapus Data Secara Permanen</DialogTitle>
                                <DialogDescription>
                                    Pilih jenis data yang ingin Anda hapus. Tindakan ini tidak dapat diurungkan. Kategori pengeluaran tidak akan terhapus.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="delete-products" checked={dataToDelete.products} onCheckedChange={(checked) => setDataToDelete(prev => ({...prev, products: !!checked}))} />
                                    <Label htmlFor="delete-products" className="font-semibold">Data Produk</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="delete-sales" checked={dataToDelete.sales} onCheckedChange={(checked) => setDataToDelete(prev => ({...prev, sales: !!checked}))} />
                                    <Label htmlFor="delete-sales" className="font-semibold">Riwayat Penjualan</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="delete-returns" checked={dataToDelete.returns} onCheckedChange={(checked) => setDataToDelete(prev => ({...prev, returns: !!checked}))} />
                                    <Label htmlFor="delete-returns" className="font-semibold">Data Retur</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="delete-expenses" checked={dataToDelete.expenses} onCheckedChange={(checked) => setDataToDelete(prev => ({...prev, expenses: !!checked}))} />
                                    <Label htmlFor="delete-expenses" className="font-semibold">Data Pengeluaran</Label>
                                </div>
                            </div>
                             <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="secondary" disabled={isDeleting}>Batal</Button>
                                </DialogClose>
                                <Button variant="destructive" onClick={handleClearData} disabled={isDeleteButtonDisabled}>
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Ya, Hapus Data Terpilih
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
});

PengaturanPage.displayName = 'PengaturanPage';
export default PengaturanPage;
