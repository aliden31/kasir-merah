'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { SaleItem, Product } from '@/lib/types';
import { PlusCircle, MinusCircle, Search, Calendar as CalendarIcon, ArrowLeft, ShoppingCart } from 'lucide-react';
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
import { getProducts, addSale } from '@/lib/data-service';
import { Badge } from '@/components/ui/badge';

interface KasirPageProps {
  cart: SaleItem[];
  addToCart: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartItemCount: number;
}


const KasirPage: FC<KasirPageProps> = ({ cart, addToCart, updateQuantity, clearCart, cartItemCount }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState(0);
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>()
  const [currentSlide, setCurrentSlide] = React.useState(0)

  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
        try {
            const productsData = await getProducts();
            setProducts(productsData);
        } catch (error) {
            toast({ title: "Error", description: "Gagal memuat data produk.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    fetchProducts();
  }, [toast]);

  React.useEffect(() => {
    if (!carouselApi) {
      return
    }
 
    setCurrentSlide(carouselApi.selectedScrollSnap())
 
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap())
    })
  }, [carouselApi])

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };
  
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
        await addSale(newSale);
        toast({
          title: "Pembayaran Berhasil",
          description: `Total pembayaran ${formatCurrency(total)} telah berhasil diproses.`,
        });
        clearCart();
        setDiscount(0);
        // re-fetch products to update stock
        const productsData = await getProducts();
        setProducts(productsData);
    } catch (error) {
        toast({ title: "Error", description: "Gagal menyimpan transaksi.", variant: "destructive" });
        console.error(error);
    }
  }

  if (loading) {
      return <div>Memuat...</div>
  }

  return (
    <>
      <div className="lg:hidden">
        <Carousel setApi={setCarouselApi} className="w-full">
          <CarouselContent>
            <CarouselItem>
              <div className="lg:col-span-2">
                    <Card className="h-full flex flex-col shadow-none border-0">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Pilih Produk</CardTitle>
                        </div>
                        <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari produk..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow p-0">
                        <ScrollArea className="h-[calc(100vh-16rem)]">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
                            {filteredProducts.map((product) => (
                              <Card
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="cursor-pointer hover:shadow-lg transition-shadow group flex items-center justify-center p-4"
                              >
                                <CardContent className="p-0 text-center">
                                    <h3 className="font-semibold text-sm">{product.name}</h3>
                                    <p className="text-xs text-primary font-medium">{formatCurrency(product.sellingPrice)}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                    </CardContent>
                    </Card>
                </div>
            </CarouselItem>
            <CarouselItem>
                <div className="lg:col-span-1">
                    <Card className="h-full flex flex-col shadow-none border-0">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <Button variant="outline" onClick={() => carouselApi?.scrollPrev()}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Produk
                            </Button>
                            <CardTitle>Keranjang</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <ScrollArea className="h-[calc(100vh-22rem)]">
                        {cart.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10">
                            <p>Keranjang masih kosong.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                            {cart.map((item) => (
                                <div key={item.product.id} className="flex items-center gap-4">
                                <Image
                                    src={`https://placehold.co/100x100.png`}
                                    data-ai-hint={`${item.product.category}`}
                                    alt={item.product.name}
                                    width={64}
                                    height={64}
                                    className="rounded-md object-cover"
                                />
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
                                    <span className="w-6 text-center">{item.quantity}</span>
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
                                <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
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
                                        className="w-[180px] justify-start text-left font-normal"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
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
                                className="w-20 h-8"
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
                </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        {currentSlide === 0 && (
          <Button
            className="fixed bottom-4 right-4 h-16 w-16 rounded-full shadow-lg lg:hidden"
            size="icon"
            onClick={() => carouselApi?.scrollNext()}
          >
            <ShoppingCart className="h-6 w-6" />
            <span className="sr-only">Keranjang</span>
            {cartItemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-1"
              >
                {cartItemCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-6 h-full lg:h-[calc(100vh-5rem)]">
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="hidden sm:block">
                <CardTitle>Pilih Produk</CardTitle>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <ScrollArea className="h-full lg:h-[calc(100vh-16rem)]">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="cursor-pointer hover:shadow-lg transition-shadow group flex items-center justify-center p-4"
                    >
                      <CardContent className="p-0 text-center">
                          <h3 className="font-semibold text-sm">{product.name}</h3>
                          <p className="text-xs text-primary font-medium">{formatCurrency(product.sellingPrice)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Keranjang</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <ScrollArea className="h-full lg:h-[calc(100vh-25rem)]">
                {cart.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10">
                    <p>Keranjang masih kosong.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-4">
                        <Image
                          src={`https://placehold.co/100x100.png`}
                          data-ai-hint={`${item.product.category}`}
                          alt={item.product.name}
                          width={64}
                          height={64}
                          className="rounded-md object-cover"
                        />
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
                            <span className="w-6 text-center">{item.quantity}</span>
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
                        <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <Separator />
            <CardFooter className="flex-col !p-4">
              <div className="w-full space-y-2 text-sm">
                  <div className="flex justify-between items-center mb-2">
                      <span>Tanggal Transaksi</span>
                      <Popover>
                          <PopoverTrigger asChild>
                          <Button
                              variant={"outline"}
                              className="w-[180px] justify-start text-left font-normal"
                          >
                              <CalendarIcon className="mr-2 h-4 w-4" />
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
                        className="w-20 h-8"
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
        </div>
      </div>
    </>
  );
};

export default KasirPage;
