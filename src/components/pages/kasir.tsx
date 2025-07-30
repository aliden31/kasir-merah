'use client';

import type { FC } from 'react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { placeholderProducts } from '@/lib/placeholder-data';
import type { SaleItem } from '@/lib/types';
import { PlusCircle, MinusCircle, Trash2, Search, X } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

const KasirPage: FC = () => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [discount, setDiscount] = useState(0);
  const { toast } = useToast();

  const addToCart = (product: (typeof placeholderProducts)[0]) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1, price: product.sellingPrice }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
    } else {
      setCart((prevCart) =>
        prevCart.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
      );
    }
  };

  const filteredProducts = placeholderProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };
  
  const handlePayment = () => {
    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Keranjang Kosong",
        description: "Silakan tambahkan produk ke keranjang terlebih dahulu.",
      });
      return;
    }
    toast({
      title: "Pembayaran Berhasil",
      description: `Total pembayaran ${formatCurrency(total)} telah berhasil diproses.`,
    });
    setCart([]);
    setDiscount(0);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-4rem)]">
      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Pilih Produk</CardTitle>
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
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="cursor-pointer hover:shadow-lg transition-shadow group"
                  >
                    <CardContent className="p-0">
                      <Image
                        src={`https://placehold.co/300x200.png`}
                        data-ai-hint={`${product.category}`}
                        alt={product.name}
                        width={300}
                        height={200}
                        className="rounded-t-lg object-cover"
                      />
                      <div className="p-4">
                        <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                        <p className="text-xs text-primary font-medium">{formatCurrency(product.sellingPrice)}</p>
                      </div>
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
  );
};

export default KasirPage;
