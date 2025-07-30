'use client';

import React, { useState, useEffect } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  LayoutGrid,
  Package,
  ScrollText,
  Undo2,
  Wallet,
  AreaChart,
  Zap,
  Settings,
  Store,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import KasirPage from '@/components/pages/kasir';
import ProdukPage from '@/components/pages/produk';
import PenjualanPage from '@/components/pages/penjualan';
import ReturPage from '@/components/pages/retur';
import PengeluaranPage from '@/components/pages/pengeluaran';
import LaporanPage from '@/components/pages/laporan';
import FlashSalePage from '@/components/pages/flash-sale';
import PengaturanPage from '@/components/pages/pengaturan';
import { SaleItem, Product, Settings as AppSettings } from '@/lib/types';
import { getSettings } from '@/lib/data-service';

type View =
  | 'kasir'
  | 'produk'
  | 'penjualan'
  | 'retur'
  | 'pengeluaran'
  | 'laporan'
  | 'flash-sale'
  | 'pengaturan';

export default function Home() {
  const [activeView, setActiveView] = useState<View>('kasir');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ storeName: 'Memuat...', defaultDiscount: 0 });

  useEffect(() => {
    const fetchSettings = async () => {
      const appSettings = await getSettings();
      setSettings(appSettings);
    };
    fetchSettings();
  }, []);

  const addToCart = (product: Product) => {
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

  const clearCart = () => {
    setCart([]);
  };

  const menuItems = [
    { id: 'kasir', label: 'Kasir', icon: LayoutGrid },
    { id: 'produk', label: 'Produk', icon: Package },
    { id: 'penjualan', label: 'Riwayat Penjualan', icon: ScrollText },
    { id: 'retur', label: 'Retur', icon: Undo2 },
    { id: 'pengeluaran', label: 'Pengeluaran', icon: Wallet },
    { id: 'laporan', label: 'Laporan Arus Kas', icon: AreaChart },
    { id: 'flash-sale', label: 'Flash Sale', icon: Zap },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  ];
  
  const activeMenu = menuItems.find(item => item.id === activeView);

  const renderView = () => {
    switch (activeView) {
      case 'kasir':
        return <KasirPage 
          cart={cart}
          addToCart={addToCart}
          updateQuantity={updateQuantity}
          clearCart={clearCart}
          cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          defaultDiscount={settings.defaultDiscount}
        />;
      case 'produk':
        return <ProdukPage />;
      case 'penjualan':
        return <PenjualanPage />;
      case 'retur':
        return <ReturPage />;
      case 'pengeluaran':
        return <PengeluaranPage />;
      case 'laporan':
        return <LaporanPage />;
      case 'flash-sale':
        return <FlashSalePage />;
      case 'pengaturan':
        return <PengaturanPage settings={settings} onSettingsChange={setSettings} />;
      default:
        return <KasirPage 
          cart={cart}
          addToCart={addToCart}
          updateQuantity={updateQuantity}
          clearCart={clearCart}
          cartItemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          defaultDiscount={settings.defaultDiscount}
        />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <Store className="h-5 w-5 text-primary" />
              </Button>
              <div className="flex flex-col">
                <span className="font-semibold tracking-tight">{settings.storeName}</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveView(item.id as View)}
                    isActive={activeView === item.id}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <Separator />
          <SidebarFooter>
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://placehold.co/100x100" alt="Avatar" />
                <AvatarFallback>TC</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">Kasir</p>
                <p className="text-xs text-muted-foreground">kasir@tokocepat.com</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <SidebarTrigger className="sm:hidden" />
                <h1 className="text-xl font-semibold sm:hidden">{activeMenu?.label}</h1>
            </header>
            <main className="p-4 md:p-6">{renderView()}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
