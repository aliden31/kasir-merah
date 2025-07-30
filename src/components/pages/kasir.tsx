
'use client';

import type { FC } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { SaleItem, Product, Settings, FlashSale, Sale, Expense, Return, ReturnItem } from '@/lib/types';
import { PlusCircle, MinusCircle, Search, Calendar as CalendarIcon, ArrowLeft, ShoppingCart, Zap, Undo2, Wallet, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { getProducts, addSale, getSales, getReturns, addReturn, getExpenses, addExpense } from '@/lib/data-service';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// ReturnForm Component (copied from retur.tsx)
const ReturnForm = ({ sales, onSave, onOpenChange }: { sales: Sale[], onSave: (item: Omit<Return, 'id'>) => Promise<void>, onOpenChange: (open: boolean) => void }) => {
    const [selectedSaleId, setSelectedSaleId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [itemsToReturn, setItemsToReturn] = useState<ReturnItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    
    const selectedSale = useMemo(() => sales.find(s => s.id === selectedSaleId), [selectedSaleId, sales]);

    useEffect(() => {
        setItemsToReturn([]);
    }, [selectedSaleId]);

    const handleAddProductToReturn = (productId: string) => {
        if (!selectedSale) return;
        const saleItem = selectedSale.items.find(item => item.product.id === productId);
        if (saleItem && !itemsToReturn.find(item => item.productId === productId)) {
            setItemsToReturn(prev => [...prev, {
                productId: saleItem.product.id,
                productName: saleItem.product.name,
                quantity: 1,
                priceAtSale: saleItem.price,
                costPriceAtSale: saleItem.costPriceAtSale,
            }]);
        }
    };
    
    const updateReturnQuantity = (productId: string, quantity: number) => {
        const saleItem = selectedSale?.items.find(item => item.product.id === productId);
        const maxQuantity = saleItem?.quantity || 0;

        if (quantity <= 0) {
             setItemsToReturn(prev => prev.filter(item => item.productId !== productId));
             return;
        }

        if (quantity > maxQuantity) {
            toast({
                variant: "destructive",
                title: "Jumlah Melebihi Pembelian",
                description: `Jumlah retur tidak boleh melebihi jumlah pembelian (${maxQuantity})`,
            });
            quantity = maxQuantity;
        }

        setItemsToReturn(prev => prev.map(item => item.productId === productId ? { ...item, quantity } : item));
    }

    const handleSubmit = async () => {
        if (!selectedSaleId || itemsToReturn.length === 0) {
            toast({ variant: "destructive", title: "Input Tidak Lengkap", description: "Pilih transaksi dan produk yang akan diretur." });
            return;
        }
        setIsSaving(true);
        const totalRefund = itemsToReturn.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);
        const newReturn: Omit<Return, 'id'> = {
            saleId: selectedSaleId,
            items: itemsToReturn,
            reason,
            date: new Date(),
            totalRefund,
        };
        await onSave(newReturn);
        setIsSaving(false);
        onOpenChange(false);
    }
    
    const availableProductsForReturn = selectedSale?.items.filter(
        saleItem => !itemsToReturn.some(returnItem => returnItem.productId === saleItem.product.id)
    ) || [];
    
    const sortedSales = useMemo(() => sales.sort((a,b) => b.date.getTime() - a.date.getTime()), [sales]);
    const salesMap = useMemo(() => new Map(sortedSales.map((sale, index) => [sale.id, sortedSales.length - index])), [sortedSales]);

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Tambah Retur Baru</DialogTitle>
                <DialogDescription>Pilih transaksi, lalu pilih produk yang akan dikembalikan.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="saleId" className="text-right">Transaksi</Label>
                    <Select onValueChange={setSelectedSaleId} value={selectedSaleId}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Pilih ID Transaksi..." />
                        </SelectTrigger>
                        <SelectContent>
                            {sortedSales.map((sale, index) => (
                                <SelectItem key={sale.id} value={sale.id}>
                                    trx {String(salesMap.get(sale.id)).padStart(4, '0')} - {sale.date.toLocaleDateString('id-ID')} - {formatCurrency(sale.finalTotal)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {selectedSale && (
                    <>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Tambah Produk</Label>
                            <div className="col-span-3">
                                <Select onValueChange={handleAddProductToReturn} disabled={availableProductsForReturn.length === 0} value="">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih produk untuk diretur..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableProductsForReturn.map((item, index) => (
                                            <SelectItem key={`${item.product.id}-${index}`} value={item.product.id}>
                                                {item.product.name} (Dibeli: {item.quantity})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {itemsToReturn.length > 0 && (
                            <div className="col-span-4">
                                <Card>
                                    <CardContent className="p-4 max-h-48 overflow-y-auto">
                                    <h4 className="font-semibold mb-2">Produk yang akan diretur:</h4>
                                     <div className="space-y-4">
                                        {itemsToReturn.map(item => (
                                            <div key={item.productId} className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{item.productName}</p>
                                                    <p className="text-sm text-muted-foreground">{formatCurrency(item.priceAtSale)}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateReturnQuantity(item.productId, item.quantity - 1)}>
                                                        <MinusCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Input type="number" className="w-16 h-8 text-center" value={item.quantity} onChange={(e) => updateReturnQuantity(item.productId, Number(e.target.value))} />
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateReturnQuantity(item.productId, item.quantity + 1)}>
                                                        <PlusCircle className="h-4 w-4" />
                                                    </Button>
                                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateReturnQuantity(item.productId, 0)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                     </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="reason" className="text-right pt-2">Alasan</Label>
                            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="col-span-3" placeholder="Alasan pengembalian barang..." />
                        </div>
                    </>
                )}
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isSaving}>Batal</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={isSaving || itemsToReturn.length === 0 || !selectedSaleId}>
                    {isSaving ? 'Menyimpan...' : 'Simpan Retur'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

// ExpenseForm Component (copied from pengeluaran.tsx)
const ExpenseForm = ({ onSave, onOpenChange, settings }: { onSave: (expense: Omit<Expense, 'id' | 'date'> & { date?: Date }) => Promise<void>, onOpenChange: (open: boolean) => void, settings: Settings }) => {
    const [name, setName] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        if (!name || amount === '' || amount <= 0 || !category) {
            return;
        }
        setIsSaving(true);
        const newExpense: Omit<Expense, 'id'> = { name, amount: Number(amount), category, date };
        await onSave(newExpense);
        onOpenChange(false);
        // Reset form
        setName('');
        setAmount('');
        setCategory('');
        setDate(new Date());
        setIsSaving(false);
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
                    <Select onValueChange={(value) => setCategory(value as any)} value={category}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            {(settings.expenseCategories || []).map(cat => (
                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">Jumlah</Label>
                    <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))} className="col-span-3" placeholder="0" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">Tanggal</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button variant={"outline"} className="col-span-3 justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(date, "PPP", { locale: id })}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={(selectedDate) => selectedDate && setDate(selectedDate)} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            <DialogFooter>
                 <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isSaving}>Batal</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={isSaving || !name || amount === '' || amount <= 0 || !category}>
                    {isSaving ? 'Menyimpan...' : 'Simpan'}
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}


interface KasirPageProps {
  cart: SaleItem[];
  addToCart: (product: Product, flashSalePrice?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartItemCount: number;
  settings: Settings;
  flashSale: FlashSale;
}

const KasirPage: FC<KasirPageProps> = ({ cart, addToCart, updateQuantity, clearCart, cartItemCount, settings, flashSale }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState(settings.defaultDiscount);
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>()
  const [currentSlide, setCurrentSlide] = React.useState(0)
  const [sortOrder, setSortOrder] = useState('terlaris');
  const [isReturnFormOpen, setReturnFormOpen] = useState(false);
  const [isExpenseFormOpen, setExpenseFormOpen] = useState(false);

  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
        const [productsData, salesData] = await Promise.all([getProducts(), getSales()]);
        setProducts(productsData);
        setSales(salesData);
    } catch (error) {
        toast({ title: "Error", description: "Gagal memuat data.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    setDiscount(settings.defaultDiscount);
  }, [settings.defaultDiscount]);

  useEffect(() => {
    fetchData();
  }, []);

  React.useEffect(() => {
    if (!carouselApi) {
      return
    }
 
    setCurrentSlide(carouselApi.selectedScrollSnap())
 
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap())
    })
  }, [carouselApi])

  const sortedProducts = useMemo(() => {
    const productsWithSales = products.map(product => {
        const salesCount = sales.reduce((count, sale) => {
            return count + (sale.items.find(item => item.product.id === product.id)?.quantity || 0);
        }, 0);
        return { ...product, salesCount };
    });

    return [...productsWithSales].sort((a, b) => {
        switch (sortOrder) {
            case 'terlaris':
                return b.salesCount - a.salesCount;
            case 'nama-az':
                return a.name.localeCompare(b.name);
            case 'nama-za':
                return b.name.localeCompare(a.name);
            case 'stok-terbanyak':
                return b.stock - a.stock;
            case 'stok-tersedikit':
                return a.stock - b.stock;
            default:
                return 0;
        }
    });
  }, [products, sales, sortOrder]);

  const filteredProducts = sortedProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  
  const handlePayment = async () => {
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Keranjang Kosong",
        description: "Silakan tambahkan produk ke keranjang terlebih dahulu.",
      });
      return;
    }

    const newSale = {
        items: cart,
        subtotal,
        discount,
        finalTotal: total,
        date: transactionDate,
    };

    try {
        await addSale(newSale, settings);
        toast({
          title: "Pembayaran Berhasil",
          description: `Total pembayaran ${formatCurrency(total)} telah berhasil diproses.`,
        });
        clearCart();
        setDiscount(settings.defaultDiscount);
        // re-fetch products to update stock and sales for sorting
        await fetchData();
    } catch (error) {
        toast({ title: "Error", description: "Gagal menyimpan transaksi.", variant: "destructive" });
        console.error(error);
    }
  }

  const handleSaveReturn = async (itemData: Omit<Return, 'id'>) => {
    try {
        await addReturn(itemData);
        toast({ title: "Retur Disimpan", description: "Data retur baru telah berhasil disimpan." });
        // Refetch products to show updated stock
        await fetchData();
    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "Gagal menyimpan data retur.";
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
        console.error(error);
    }
  }

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id' | 'date'> & { date?: Date }) => {
    try {
        await addExpense(expenseData);
        toast({ title: "Pengeluaran Disimpan", description: `Pengeluaran telah berhasil disimpan.` });
    } catch(error) {
        toast({ title: "Error", description: "Gagal menyimpan pengeluaran.", variant: "destructive" });
        console.error(error);
    }
  }


  const getFlashSalePrice = (productId: string): number | undefined => {
    if (!flashSale.isActive) return undefined;
    const productInSale = flashSale.products.find(p => p.id === productId);
    return productInSale?.discountPrice;
  };

  const renderProductGrid = (isMobile = false) => (
    <Card className={`h-full flex flex-col shadow-none border-0 ${isMobile ? '' : 'lg:col-span-2'}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Pilih Produk</CardTitle>
          {flashSale.isActive && (
            <Badge variant="destructive" className="animate-pulse">
              <Zap className="mr-2 h-4 w-4" /> {flashSale.title}
            </Badge>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cari produk..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Urutkan berdasarkan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="terlaris">Terlaris</SelectItem>
                    <SelectItem value="nama-az">Nama A-Z</SelectItem>
                    <SelectItem value="nama-za">Nama Z-A</SelectItem>
                    <SelectItem value="stok-terbanyak">Stok Terbanyak</SelectItem>
                    <SelectItem value="stok-tersedikit">Stok Tersedikit</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className={isMobile ? "h-[calc(100vh-20rem)]" : "h-full lg:h-[calc(100vh-16rem)]"}>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {filteredProducts.map((product) => {
              const flashPrice = getFlashSalePrice(product.id);
              return (
                <Card
                  key={product.id}
                  onClick={() => addToCart(product, flashPrice)}
                  className="cursor-pointer hover:shadow-lg transition-shadow group flex flex-col p-2"
                >
                  <div className="flex-grow flex flex-col text-center justify-center p-2">
                    <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
                    {flashPrice !== undefined ? (
                      <div className="mt-1">
                        <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.sellingPrice)}</p>
                        <p className="text-sm text-destructive font-bold">{formatCurrency(flashPrice)}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-primary font-medium mt-1">{formatCurrency(product.sellingPrice)}</p>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const renderCartView = (isMobile = false) => (
     <Card className={`h-full flex flex-col shadow-none border-0 ${isMobile ? '' : 'lg:col-span-1'}`}>
        <CardHeader>
            <div className="flex justify-between items-center mb-2">
                {isMobile && (
                    <Button variant="outline" size="sm" onClick={() => carouselApi?.scrollPrev()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Produk
                    </Button>
                )}
                <CardTitle>Keranjang</CardTitle>
                <Badge variant="outline">{cartItemCount} Item</Badge>
            </div>
            <div className="flex gap-2">
                <Dialog open={isReturnFormOpen} onOpenChange={setReturnFormOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Undo2 className="mr-2 h-4 w-4" /> Retur
                        </Button>
                    </DialogTrigger>
                    <ReturnForm sales={sales} onSave={handleSaveReturn} onOpenChange={setReturnFormOpen} />
                </Dialog>
                <Dialog open={isExpenseFormOpen} onOpenChange={setExpenseFormOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Wallet className="mr-2 h-4 w-4" /> Pengeluaran
                        </Button>
                    </DialogTrigger>
                    <ExpenseForm onSave={handleSaveExpense} onOpenChange={setExpenseFormOpen} settings={settings}/>
                </Dialog>
            </div>
        </CardHeader>
        <CardContent className="flex-grow">
            <ScrollArea className={isMobile ? "h-[calc(100vh-28rem)]" : "h-full lg:h-[calc(100vh-29rem)]"}>
            {cart.length === 0 ? (
                <div className="text-center text-muted-foreground py-10 flex flex-col items-center justify-center h-full">
                  <ShoppingCart className="h-10 w-10 mb-4 text-muted-foreground/50"/>
                  <p>Keranjang masih kosong.</p>
                  <p className="text-xs">Pilih produk untuk memulai transaksi.</p>
                </div>
            ) : (
                <div className="space-y-4">
                {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-4">
                        <div className="flex-grow">
                            <p className="font-semibold text-sm">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                            <div className="flex items-center gap-2 mt-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                                <MinusCircle className="h-4 w-4" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                            </div>
                        </div>
                        <p className="font-semibold text-sm">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                ))}
                </div>
            )}
            </ScrollArea>
        </CardContent>
        <Separator />
        <CardFooter className="flex-col !p-4">
            <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between items-center">
                    <span>Tanggal Transaksi</span>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className="w-[160px] justify-start text-left font-normal text-xs h-8"
                        >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {format(transactionDate, "PPP", { locale: id })}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={transactionDate}
                            onSelect={(date) => date && setTransactionDate(date)}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span>Diskon (%)</span>
                    <Input 
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 h-8 text-sm"
                    step="0.1"
                    min="0"
                    max="100"
                    />
                </div>
                <div className="flex justify-between text-muted-foreground">
                    <span>Potongan Diskon</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>
            <Button className="w-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handlePayment}>
                Bayar
            </Button>
        </CardFooter>
        </Card>
  );

  if (loading) {
    return <div>Memuat...</div>
  }

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden">
        <Carousel setApi={setCarouselApi} className="w-full" opts={{watchDrag: false}}>
          <CarouselContent>
            <CarouselItem>
              {renderProductGrid(true)}
            </CarouselItem>
            <CarouselItem>
              {renderCartView(true)}
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        {currentSlide === 0 && (
          <Button
            className="fixed bottom-4 right-4 h-16 w-16 rounded-full shadow-lg lg:hidden z-20"
            size="icon"
            onClick={() => carouselApi?.scrollNext()}
          >
            <ShoppingCart className="h-6 w-6" />
            <span className="sr-only">Keranjang</span>
            {cartItemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full p-2 text-xs"
              >
                {cartItemCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-6 h-full lg:h-[calc(100vh-5rem)]">
        {renderProductGrid()}
        {renderCartView()}
      </div>
    </>
  );
};

export default KasirPage;
