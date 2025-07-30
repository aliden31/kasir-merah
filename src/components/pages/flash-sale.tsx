
'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FlashSale, Product } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFlashSaleSettings, saveFlashSaleSettings, getProducts } from '@/lib/data-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

interface FlashSalePageProps {
  onSettingsSave: () => void;
}


const FlashSalePage: FC<FlashSalePageProps> = ({ onSettingsSave }) => {
  const [settings, setSettings] = useState<FlashSale | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [flashSaleData, productsData] = await Promise.all([getFlashSaleSettings(), getProducts()]);
            setSettings(flashSaleData);
            setProducts(productsData);
        } catch (error) {
            toast({ title: "Error", description: "Gagal memuat data.", variant: "destructive" });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, [toast]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await saveFlashSaleSettings(settings);
      onSettingsSave(); // Panggil callback untuk menyegarkan data di Home
      toast({
        title: "Pengaturan Disimpan",
        description: "Pengaturan flash sale telah diperbarui.",
      });
    } catch (error) {
      toast({ title: "Error", description: "Gagal menyimpan pengaturan.", variant: "destructive" });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProductAdd = (productId: string) => {
    if (!settings) return;
    const productToAdd = products.find(p => p.id === productId);
    if (productToAdd && !settings.products.some(p => p.id === productId)) {
      const newProducts = [...settings.products, { ...productToAdd, discountPrice: productToAdd.sellingPrice }];
      setSettings({ ...settings, products: newProducts });
    }
  };
  
  const handleProductRemove = (productId: string) => {
    if (!settings) return;
    const newProducts = settings.products.filter(p => p.id !== productId);
    setSettings({ ...settings, products: newProducts });
  }

  const handleDiscountPriceChange = (productId: string, price: number) => {
    if (!settings) return;
    const newProducts = settings.products.map(p => 
      p.id === productId ? { ...p, discountPrice: price } : p
    );
    setSettings({ ...settings, products: newProducts });
  }

  if (loading || !settings) {
    return <div>Memuat data flash sale...</div>;
  }

  const availableProducts = products.filter(
    p => !settings.products.some(sp => sp.id === p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manajemen Flash Sale</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="flash-sale-status">Status Flash Sale</Label>
            <Switch
              id="flash-sale-status"
              checked={settings.isActive}
              onCheckedChange={(isChecked) => setSettings({ ...settings, isActive: isChecked })}
            />
          </div>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Simpan Pengaturan
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Umum</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="flash-sale-title">Judul Flash Sale</Label>
              <Input
                id="flash-sale-title"
                placeholder="Contoh: Diskon Kilat Tengah Malam"
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              />
              <p className="text-sm text-muted-foreground mt-1">Judul ini akan ditampilkan kepada pelanggan selama periode flash sale.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produk dalam Flash Sale</CardTitle>
          <CardDescription>Tambah atau hapus produk yang akan didiskon selama flash sale.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Select onValueChange={handleProductAdd} value="">
                <SelectTrigger>
                    <SelectValue placeholder="Pilih produk untuk ditambahkan..." />
                </SelectTrigger>
                <SelectContent>
                    {availableProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button variant="outline" disabled={!availableProducts.length} onClick={() => {
                const trigger = document.querySelector('.flex.items-center.gap-2.mb-4 > div > button') as HTMLElement | null;
                if(trigger) trigger.click();
            }}><PlusCircle className="mr-2 h-4 w-4"/> Tambah</Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Harga Asli</TableHead>
                  <TableHead>Harga Diskon</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.products.length > 0 ? settings.products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{formatCurrency(product.sellingPrice)}</TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        className="w-32"
                        value={product.discountPrice} 
                        onChange={(e) => handleDiscountPriceChange(product.id, Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleProductRemove(product.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">Belum ada produk untuk flash sale.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FlashSalePage;
