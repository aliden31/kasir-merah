
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
  ClipboardList,
  Home as HomeIcon,
  History,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import DashboardPage from '@/components/pages/dashboard';
import KasirPage from '@/components/pages/kasir';
import ProdukPage from '@/components/pages/produk';
import StokOpnamePage from '@/components/pages/stok-opname';
import PenjualanPage from '@/components/pages/penjualan';
import ReturPage from '@/components/pages/retur';
import PengeluaranPage from '@/components/pages/pengeluaran';
import LaporanPage from '@/components/pages/laporan';
import FlashSalePage from '@/components/pages/flash-sale';
import PengaturanPage from '@/components/pages/pengaturan';
import ActivityLogPage from '@/components/pages/activity-log';
import { SaleItem, Product, Settings as AppSettings, UserRole, FlashSale, Category } from '@/lib/types';
import { getSettings, getFlashSaleSettings, getProducts } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth-provider';
import { logout } from '@/lib/auth-service';
import { useRouter } from 'next/navigation';

type View =
  | 'dashboard'
  | 'kasir'
  | 'produk'
  | 'stok-opname'
  | 'penjualan'
  | 'retur'
  | 'pengeluaran'
  | 'laporan'
  | 'flash-sale'
  | 'pengaturan'
  | 'activity-log';

const defaultSettings: AppSettings = { 
  storeName: 'Memuat...', 
  defaultDiscount: 0, 
  syncCostPrice: true, 
  theme: 'default',
  categories: [],
  expenseCategories: [],
};
const defaultFlashSale: FlashSale = { id: 'main', title: '', isActive: false, products: [] };

export default function AppPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [flashSale, setFlashSale] = useState<FlashSale>(defaultFlashSale);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refreshAllData = async () => {
    setIsLoading(true);
    try {
      const [appSettings, flashSaleSettings, productsData] = await Promise.all([
        getSettings(),
        getFlashSaleSettings(),
        getProducts(),
      ]);
      setSettings(appSettings);
      setFlashSale(flashSaleSettings);
      setProducts(productsData);
    } catch (error) {
      toast({
        title: "Gagal memuat data",
        description: "Terjadi kesalahan saat memuat data aplikasi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    if (user) {
        refreshAllData();
    }
  }, [user]);
  
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.className = document.documentElement.className.replace(/\btheme-\S+/g, '');
    if (settings.theme !== 'dark') {
      document.documentElement.classList.add(`theme-${settings.theme}`);
    }
  }, [settings.theme]);
  
  useEffect(() => {
    if (!authLoading && userRole === 'kasir') {
      setActiveView('kasir');
    } else if (!authLoading && userRole === 'admin') {
      setActiveView('dashboard');
    }
  }, [authLoading, userRole]);


  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      toast({
        title: "Anda Telah Logout",
        description: "Anda telah berhasil keluar dari aplikasi.",
      });
    } catch (error) {
       toast({
        title: "Gagal Logout",
        description: "Terjadi kesalahan saat mencoba logout.",
        variant: "destructive",
      });
    }
  }

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, roles: ['admin'] },
    { id: 'kasir', label: 'Kasir', icon: LayoutGrid, roles: ['admin', 'kasir'] },
    { id: 'produk', label: 'Produk', icon: Package, roles: ['admin'] },
    { id: 'stok-opname', label: 'Stok Opname', icon: ClipboardList, roles: ['admin'] },
    { id: 'penjualan', label: 'Riwayat Penjualan', icon: ScrollText, roles: ['admin'] },
    { id: 'retur', label: 'Retur', icon: Undo2, roles: ['admin', 'kasir'] },
    { id: 'pengeluaran', label: 'Pengeluaran', icon: Wallet, roles: ['admin', 'kasir'] },
    { id: 'laporan', label: 'Laporan Arus Kas', icon: AreaChart, roles: ['admin'] },
    { id: 'flash-sale', label: 'Flash Sale', icon: Zap, roles: ['admin'] },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings, roles: ['admin'] },
    { id: 'activity-log', label: 'Log Aktivitas', icon: History, roles: ['admin'] },
  ];

  const menuItems = allMenuItems.filter(item => userRole && item.roles.includes(userRole));
  
  const activeMenu = menuItems.find(item => item.id === activeView);

  const renderView = () => {
    if (isLoading || authLoading) {
      return (
        <div className="space-y-6 p-4 md:p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )
    }
    switch (activeView) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveView} />;
      case 'kasir':
        return <KasirPage 
          settings={settings}
          flashSale={flashSale}
          products={products}
          onDataNeedsRefresh={refreshAllData}
          userRole={userRole!}
        />;
      case 'produk':
        return <ProdukPage onDataChange={refreshAllData} userRole={userRole!} />;
      case 'stok-opname':
        return <StokOpnamePage onDataChange={refreshAllData} userRole={userRole!}/>;
      case 'penjualan':
        return <PenjualanPage onDataChange={refreshAllData} userRole={userRole!} />;
      case 'retur':
        return <ReturPage onDataChange={refreshAllData} userRole={userRole!} />;
      case 'pengeluaran':
        return <PengeluaranPage userRole={userRole!} />;
      case 'laporan':
        return <LaporanPage onNavigate={setActiveView} />;
      case 'flash-sale':
        return <FlashSalePage onSettingsSave={refreshAllData} userRole={userRole!} />;
      case 'pengaturan':
        return <PengaturanPage settings={settings} onSettingsChange={refreshAllData} userRole={userRole!} />;
      case 'activity-log':
        return <ActivityLogPage />;
      default:
        return userRole === 'kasir' ? <KasirPage 
          settings={settings}
          flashSale={flashSale}
          products={products}
          onDataNeedsRefresh={refreshAllData}
          userRole={userRole!}
        /> : <DashboardPage onNavigate={setActiveView} />;
    }
  };

  if (authLoading || !user) {
    return <div className="flex h-screen items-center justify-center">Memuat data pengguna...</div>;
  }

  return (
    <SidebarProvider>
      <div className={cn("flex min-h-screen bg-background")}>
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
            <div className="flex flex-col gap-4 p-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${user.email}`} alt="Avatar" />
                    <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold capitalize">{userRole}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-xl font-semibold">{activeMenu?.label}</h1>
            </header>
            <main className="p-4 md:p-6">{renderView()}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
