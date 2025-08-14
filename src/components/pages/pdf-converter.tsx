
'use client';

import type { FC } from 'react';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileDown, Loader2, AlertCircle } from 'lucide-react';
import { convertPdfToExcel } from '@/ai/flows/pdf-to-excel-flow';

type ConverterState = 'idle' | 'analyzing' | 'success' | 'error';

const PdfConverterPage: FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [state, setState] = useState<ConverterState>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [excelDataB64, setExcelDataB64] = useState('');
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === 'application/pdf') {
                setFile(selectedFile);
                setState('idle');
                setErrorMessage('');
            } else {
                toast({
                    title: 'File tidak valid',
                    description: 'Harap pilih file dengan format PDF.',
                    variant: 'destructive'
                });
                setFile(null);
            }
        }
    };

    const handleConvert = async () => {
        if (!file) return;

        setState('analyzing');
        setErrorMessage('');
        setExcelDataB64('');

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const fileDataUri = reader.result as string;
                const result = await convertPdfToExcel({ fileDataUri });

                if (result.excelDataB64) {
                    setExcelDataB64(result.excelDataB64);
                    setState('success');
                    toast({
                        title: 'Konversi Berhasil',
                        description: 'File Excel Anda siap untuk diunduh.',
                    });
                } else {
                    setErrorMessage(result.error || 'AI tidak dapat menemukan data penjualan di dalam file. Coba file lain atau pastikan formatnya jelas.');
                    setState('error');
                }
            } catch (error) {
                console.error('Conversion failed:', error);
                setErrorMessage('Terjadi kesalahan saat menganalisis file. Lihat konsol untuk detail.');
                setState('error');
            }
        };
        reader.onerror = () => {
            setErrorMessage('Gagal membaca file. Silakan coba lagi.');
            setState('error');
        };
    };

    const handleDownload = () => {
        if (!excelDataB64) return;
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelDataB64}`;
        link.download = `${file?.name.replace('.pdf', '') || 'hasil-konversi'}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Konverter PDF ke Excel</h1>
                <p className="text-muted-foreground">Unggah file PDF berisi data penjualan untuk dikonversi menjadi file Excel.</p>
            </div>
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Unggah File PDF</CardTitle>
                    <CardDescription>Pilih file PDF dari perangkat Anda untuk memulai konversi.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input id="pdf-upload" type="file" onChange={handleFileChange} accept="application/pdf" disabled={state === 'analyzing'} />
                    
                    <Button onClick={handleConvert} disabled={!file || state === 'analyzing'} className="w-full">
                        {state === 'analyzing' ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Menganalisis...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Konversi ke Excel
                            </>
                        )}
                    </Button>
                    
                    {state === 'success' && excelDataB64 && (
                        <Button onClick={handleDownload} variant="secondary" className="w-full">
                            <FileDown className="mr-2 h-4 w-4" />
                            Unduh File Excel
                        </Button>
                    )}

                    {state === 'error' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Konversi Gagal</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default PdfConverterPage;

    