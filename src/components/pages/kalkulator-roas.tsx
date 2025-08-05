
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp } from 'lucide-react';

const formatCurrency = (amount: number) => {
    if (isNaN(amount) || !isFinite(amount)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

const formatNumber = (amount: number, precision = 2) => {
    if (isNaN(amount) || !isFinite(amount)) return '0';
    const num = new Intl.NumberFormat('id-ID', { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(amount);
    return num;
};


const KalkulatorRoasPage: React.FC = () => {
    const [inputs, setInputs] = useState({
        hargaFinal: '',
        voucherToko: '',
        adminFee: '6.5',
        hppPerPcs: '',
        l30dPembeli: '',
        l30dPcsTerjual: '',
        biayaPacking: '',
        targetProfit: '20',
        overheadCost: '5',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setInputs(prev => ({ ...prev, [id]: value }));
    };

    const calculated = useMemo(() => {
        const A = parseFloat(inputs.hargaFinal) || 0;
        const B = parseFloat(inputs.voucherToko) || 0;
        const C = parseFloat(inputs.adminFee) || 0;
        const E = parseFloat(inputs.hppPerPcs) || 0;
        const F = parseFloat(inputs.l30dPembeli) || 0;
        const G = parseFloat(inputs.l30dPcsTerjual) || 0;
        const biayaPacking = parseFloat(inputs.biayaPacking) || 0;
        const M = parseFloat(inputs.overheadCost) || 0;
        const O = parseFloat(inputs.targetProfit) || 0;
        
        // D. OMZET REAL (A-B)x(1-C)
        const D = (A - B) * (1 - C / 100);

        // Biaya per Pesanan
        const pcsPerPesanan = F > 0 ? G / F : 1;
        const hppPerPesanan = E * pcsPerPesanan;
        const totalBiayaModalPerPesanan = hppPerPesanan + biayaPacking;
        
        // Laba Kotor per Pesanan (sebelum biaya operasional lain)
        const labaKotorPerPesanan = D - totalBiayaModalPerPesanan;

        // N. Estimasi Overhead non iklan M% x D
        const N = D * (M / 100);
        // P. Estimasi Profit bersih per pcs O% x D
        const P = D * (O / 100);

        // Q. Iklan MAX per pcs L-N-P (Laba Kotor - Overhead - Target Profit)
        const Q = labaKotorPerPesanan - N - P;

        // R. ROAS Pembukuan D/Q
        const R = Q > 0 ? D / Q : 0;
        
        // S. ROAS SC shopee iklan A/(Q/1.11)
        const S = Q > 0 ? A / (Q / 1.11) : 0;


        return {
            omzetReal: D,
            pcsPerPesanan,
            hppPerPesanan,
            totalBiayaModalPerPesanan,
            labaKotorPerPesanan,
            estimasiProfit: P,
            estimasiOverhead: N,
            budgetIklanMax: Q,
            roasPembukuan: R,
            roasPlatform: S
        };
    }, [inputs]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Kalkulator Profitabilitas & ROAS</h1>
                <p className="text-muted-foreground">Analisis biaya, profit, dan target ROAS untuk setiap produk Anda.</p>
            </div>
            
            <div className="grid lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Penjualan</CardTitle>
                            <CardDescription>Masukkan detail pendapatan untuk satu unit produk.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hargaFinal">Harga Jual Produk (A)</Label>
                                <Input id="hargaFinal" type="number" placeholder="Contoh: 100000" value={inputs.hargaFinal} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="voucherToko">Maksimal Voucher Toko (B)</Label>
                                <Input id="voucherToko" type="number" placeholder="Contoh: 5000" value={inputs.voucherToko} onChange={handleInputChange} />
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Data Biaya & Operasional</CardTitle>
                            <CardDescription>Masukkan semua biaya yang terkait dengan produk dan operasional.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hppPerPcs">Harga Pokok Penjualan (HPP) /pcs (E)</Label>
                                    <Input id="hppPerPcs" type="number" placeholder="Contoh: 40000" value={inputs.hppPerPcs} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="biayaPacking">Biaya Packing /pesanan</Label>
                                    <Input id="biayaPacking" type="number" placeholder="Contoh: 1500" value={inputs.biayaPacking} onChange={handleInputChange} />
                                </div>
                            </div>
                             <Separator />
                            <p className="text-xs text-muted-foreground pt-2">Data berikut digunakan untuk menghitung rata-rata item per pesanan. Gunakan data dari 30 hari terakhir untuk akurasi.</p>
                             <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="l30dPcsTerjual">Total Pcs Terjual (G)</Label>
                                    <Input id="l30dPcsTerjual" type="number" placeholder="Contoh: 120" value={inputs.l30dPcsTerjual} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="l30dPembeli">Total Pesanan (F)</Label>
                                    <Input id="l30dPembeli" type="number" placeholder="Contoh: 100" value={inputs.l30dPembeli} onChange={handleInputChange} />
                                </div>
                            </div>
                            <Separator/>
                             <div className="grid sm:grid-cols-3 gap-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="adminFee">Admin Platform (%) (C)</Label>
                                    <Input id="adminFee" type="number" value={inputs.adminFee} onChange={handleInputChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="overheadCost">Overhead Non-Iklan (%) (M)</Label>
                                    <Input id="overheadCost" type="number" value={inputs.overheadCost} onChange={handleInputChange} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="targetProfit">Target Profit Bersih (%) (O)</Label>
                                    <Input id="targetProfit" type="number" value={inputs.targetProfit} onChange={handleInputChange} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6 sticky top-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Hasil Analisis</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label>Omzet Real / Pesanan (D)</Label>
                                <span className="font-bold text-lg">{formatCurrency(calculated.omzetReal)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <Label>Laba Kotor / Pesanan</Label>
                                <span className="font-bold text-lg">{formatCurrency(calculated.labaKotorPerPesanan)}</span>
                            </div>
                            <Separator />
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <Label className="text-muted-foreground">Target Profit ({inputs.targetProfit}%) (P)</Label>
                                    <span className="font-medium">-{formatCurrency(calculated.estimasiProfit)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label className="text-muted-foreground">Biaya Overhead ({inputs.overheadCost}%) (N)</Label>
                                    <span className="font-medium">-{formatCurrency(calculated.estimasiOverhead)}</span>
                                </div>
                            </div>
                            <Separator />
                            <Alert className="bg-primary/10 border-primary/20">
                                <TrendingUp className="h-4 w-4 !text-primary" />
                                <AlertTitle className="text-primary !mb-0">Batas Biaya Iklan / Pesanan (Q)</AlertTitle>
                                <AlertDescription className="text-2xl font-bold text-primary">
                                    {formatCurrency(calculated.budgetIklanMax)}
                                </AlertDescription>
                            </Alert>
                             <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center text-sm">
                                    <Label>Target ROAS Pembukuan (R)</Label>
                                    <span className="font-semibold text-base">{formatNumber(calculated.roasPembukuan, 2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <Label>Target ROAS Platform Iklan (S)</Label>
                                    <span className="font-semibold text-base">{formatNumber(calculated.roasPlatform, 2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Detail Perhitungan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <Label className="text-muted-foreground">Rata-rata Pcs / Pesanan</Label>
                                <span className="font-medium">{formatNumber(calculated.pcsPerPesanan, 2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <Label className="text-muted-foreground">HPP / Pesanan</Label>
                                <span className="font-medium">{formatCurrency(calculated.hppPerPesanan)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <Label className="text-muted-foreground">Total Modal / Pesanan</Label>
                                <span className="font-medium">{formatCurrency(calculated.totalBiayaModalPerPesanan)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default KalkulatorRoasPage;

    