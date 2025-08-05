
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const formatCurrency = (amount: number) => {
    if (isNaN(amount) || !isFinite(amount)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount));
};

const formatNumber = (amount: number, precision = 2) => {
    if (isNaN(amount) || !isFinite(amount)) return '0';
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(amount);
};


const KalkulatorRoasPage: React.FC = () => {
    const [inputs, setInputs] = useState({
        hargaFinal: '', // A
        voucherMax: '', // B
        adminFee: '', // C
        hppPerPcs: '', // E
        l30dPembeli: '', // F
        l30dPcsTerjual: '', // G
        biayaProsesPesananConst: '1250',
        hppTambahan: '',
        overheadNonIklan: '', // M
        targetProfitMargin: '', // O
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setInputs(prev => ({ ...prev, [id]: value }));
    };

    const calculated = useMemo(() => {
        const A = parseFloat(inputs.hargaFinal) || 0;
        const B = parseFloat(inputs.voucherMax) || 0;
        const C = parseFloat(inputs.adminFee) || 0;
        const E = parseFloat(inputs.hppPerPcs) || 0;
        const F = parseFloat(inputs.l30dPembeli) || 0;
        const G = parseFloat(inputs.l30dPcsTerjual) || 0;
        const biayaProses = parseFloat(inputs.biayaProsesPesananConst) || 0;
        const hppTambahan = parseFloat(inputs.hppTambahan) || 0;
        const M = parseFloat(inputs.overheadNonIklan) || 0;
        const O = parseFloat(inputs.targetProfitMargin) || 0;
        
        // Original Calculations
        const D = (A - B) * (1 - C / 100);
        const H = G > 0 ? F / G : 0;
        const I = H * biayaProses;
        const J = E * H; // HPP /pesanan is HPP/pcs * Faktor Pengali
        const K = J + I + hppTambahan;
        
        // New Calculations
        const L = D - K; // Laba Kotor per Pesanan
        const N = D * (M / 100);
        const P = D * (O / 100);
        const Q = L - N - P;
        const R = Q > 0 ? D / Q : 0;
        const S = Q > 0 ? A / (Q / 1.11) : 0;

        return {
            omzetReal: D,
            faktorPengali: H,
            biayaProsesPesanan: I,
            hppPerPesanan: J,
            hppReal: K,
            estimasiOverhead: N,
            estimasiProfit: P,
            iklanMax: Q,
            roasPembukuan: R,
            roasShopee: S
        };
    }, [inputs]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Kalkulator ROAS Shopee</h1>
                <p className="text-muted-foreground">Hitung HPP riil per pesanan untuk mengoptimalkan strategi iklan Anda.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Input Data</CardTitle>
                        <CardDescription>Masukkan data dari Shopee untuk melakukan perhitungan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hargaFinal">A. Harga Final (setelah disc)</Label>
                                <Input id="hargaFinal" type="number" placeholder="Contoh: 50000" value={inputs.hargaFinal} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="voucherMax">B. Voucher max (Rp)</Label>
                                <Input id="voucherMax" type="number" placeholder="Contoh: 5000" value={inputs.voucherMax} onChange={handleInputChange} />
                            </div>
                         </div>
                         <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="adminFee">C. Admin Fee (%)</Label>
                                <Input id="adminFee" type="number" placeholder="Contoh: 6.5" value={inputs.adminFee} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hppPerPcs">E. HPP/pcs</Label>
                                <Input id="hppPerPcs" type="number" placeholder="Contoh: 20000" value={inputs.hppPerPcs} onChange={handleInputChange} />
                            </div>
                        </div>
                        <Separator />
                        <div className="grid sm:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="l30dPembeli">F. L30D Pembeli</Label>
                                <Input id="l30dPembeli" type="number" placeholder="Contoh: 100" value={inputs.l30dPembeli} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="l30dPcsTerjual">G. L30D pcs Terjual</Label>
                                <Input id="l30dPcsTerjual" type="number" placeholder="Contoh: 120" value={inputs.l30dPcsTerjual} onChange={handleInputChange} />
                            </div>
                        </div>
                        <Separator />
                        <div className="grid sm:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="biayaProsesPesananConst">Biaya Proses / Resi</Label>
                                <Input id="biayaProsesPesananConst" type="number" value={inputs.biayaProsesPesananConst} onChange={handleInputChange} />
                             </div>
                             <div className="space-y-2">
                                <Label htmlFor="hppTambahan">HPP Tambahan / Pesanan</Label>
                                <Input id="hppTambahan" type="number" placeholder="Contoh: Biaya packing" value={inputs.hppTambahan} onChange={handleInputChange} />
                             </div>
                        </div>
                        <Separator />
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="overheadNonIklan">M. Overhead non iklan (%)</Label>
                                <Input id="overheadNonIklan" type="number" placeholder="Biaya kontrakan, internet, dll." value={inputs.overheadNonIklan} onChange={handleInputChange} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="targetProfitMargin">O. Target profit margin bersih (%)</Label>
                                <Input id="targetProfitMargin" type="number" placeholder="Target laba sebelum pajak" value={inputs.targetProfitMargin} onChange={handleInputChange} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Hasil Kalkulasi</CardTitle>
                        <CardDescription>Hasil perhitungan berdasarkan data yang Anda masukkan.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label>D. OMZET REAL</Label>
                            <span className="font-semibold text-lg">{formatCurrency(calculated.omzetReal)}</span>
                        </div>
                         <Separator />
                        <div className="flex justify-between items-center text-sm">
                            <Label>H. Faktor Pengali</Label>
                            <span className="font-semibold">{formatNumber(calculated.faktorPengali)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <Label>I. Biaya Proses Pesanan</Label>
                            <span className="font-semibold">{formatCurrency(calculated.biayaProsesPesanan)}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <Label>J. HPP / Pesanan</Label>
                            <span className="font-semibold">{formatCurrency(calculated.hppPerPesanan)}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm font-bold">
                            <Label>K. HPP REAL</Label>
                            <span className="font-semibold">{formatCurrency(calculated.hppReal)}</span>
                         </div>
                         <Separator />
                         <div className="flex justify-between items-center text-sm">
                            <Label>N. Estimasi Overhead</Label>
                            <span className="font-semibold">{formatCurrency(calculated.estimasiOverhead)}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <Label>P. Estimasi Profit</Label>
                            <span className="font-semibold">{formatCurrency(calculated.estimasiProfit)}</span>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-md font-bold">Q. Iklan MAX per pcs</Label>
                                <span className="font-bold text-lg text-primary">{formatCurrency(calculated.iklanMax)}</span>
                            </div>
                        </div>
                         <Separator />
                         <div className="flex justify-between items-center text-sm">
                            <Label>R. ROAS Pembukuan</Label>
                            <span className="font-semibold">{formatNumber(calculated.roasPembukuan)}</span>
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <Label>S. ROAS SC Shopee Iklan</Label>
                            <span className="font-semibold">{formatNumber(calculated.roasShopee)}</span>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default KalkulatorRoasPage;
