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
import type { Product } from '@/lib/types';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { getProducts, addProduct, updateProduct, deleteProduct, addPlaceholderProducts } from '@/lib/data-service';


const ProductForm = ({ product, onSave, onOpenChange }: { product?: Product, onSave: (product: Product | Omit<Product, 'id'>) => void, onOpenChange: (open: boolean) => void }) => {
    const [name, setName] = useState(product?.name || '');
    const [costPrice, setCostPrice] = useState(product?.costPrice || 0);
    const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice || 0);
    const [stock, setStock] = useState(product?.stock || 0);
    const [category, setCategory] = useState(product?.category || '');

    const handleSubmit = () => {
        const productData = {
            name,
            costPrice,
            sellingPrice,
            stock,
            category,
        };

        if (product?.id) {
            onSave({ id: product.id, ...productData });
        } else {
            onSave(productData);
        }
        
        onOpenChange(false);
    };
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nama</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">Kategori</Label>
                    <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="costPrice" className="text-right">Harga Modal</Label>
                    <Input id="costPrice" type="number" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sellingPrice" className="text-right">Harga Jual</Label>
                    <Input id="sellingPrice" type="number" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="stock" className="text-right">Stok</Label>
                    <Input id="stock" type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Batal</Button>
                </DialogClose>
                <Button onClick={handleSubmit}>Simpan</Button>
            </DialogFooter>
        </DialogContent>
    );
}

const ProdukPage: FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
        try {
            let productsData = await getProducts();
            if (productsData.length === 0) {
                toast({ title: "Database produk kosong", description: "Menginisialisasi dengan data sampel..." });
                await addPlaceholderProducts();
                productsData = await getProducts(); // Refetch after adding placeholders
                toast({ title: "Inisialisasi berhasil", description: "Data produk sampel telah ditambahkan." });
            }
            setProducts(productsData);
        } catch (error) {
            toast({ title: "Error", description: "Gagal memuat data produk.", variant: "destructive" });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }
    fetchProducts();
  }, [toast]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };
  
  const handleSaveProduct = async (productData: Product | Omit<Product, 'id'>) => {
    try {
        if ('id' in productData) {
            await updateProduct(productData.id, productData);
            setProducts(prev => prev.map(p => p.id === productData.id ? {...p, ...productData} : p));
            toast({ title: "Produk diperbarui", description: `${productData.name} telah berhasil diperbarui.` });
        } else {
            const newProduct = await addProduct(productData);
            setProducts(prev => [...prev, newProduct]);
            toast({ title: "Produk ditambahkan", description: `${newProduct.name} telah berhasil ditambahkan.` });
        }
    } catch (error) {
        toast({ title: "Error", description: "Gagal menyimpan produk.", variant: "destructive" });
        console.error(error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
        await deleteProduct(productId);
        setProducts(prev => prev.filter(p => p.id !== productId));
        toast({
            title: "Produk Dihapus",
            description: "Produk telah berhasil dihapus dari daftar.",
            variant: "destructive"
        });
    } catch (error) {
        toast({ title: "Error", description: "Gagal menghapus produk.", variant: "destructive" });
        console.error(error);
    }
  }

  if (loading) {
    return <div>Memuat data produk...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manajemen Produk</h1>
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Produk
                </Button>
            </DialogTrigger>
            <ProductForm onSave={handleSaveProduct} onOpenChange={setFormOpen} />
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Produk</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead className="text-right">Harga Modal</TableHead>
            <TableHead className="text-right">Harga Jual</TableHead>
            <TableHead className="text-right">Stok</TableHead>
            <TableHead className="text-center">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.category}</TableCell>
              <TableCell className="text-right">{formatCurrency(product.costPrice)}</TableCell>
              <TableCell className="text-right">{formatCurrency(product.sellingPrice)}</TableCell>
              <TableCell className="text-right">{product.stock}</TableCell>
              <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                             <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <ProductForm product={product} onSave={handleSaveProduct} onOpenChange={()=>{}} />
                    </Dialog>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tindakan ini tidak dapat diurungkan. Ini akan menghapus produk secara permanen dari database.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteProduct(product.id)} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProdukPage;
