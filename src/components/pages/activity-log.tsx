
'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import type { ActivityLog } from '@/lib/types';
import { getActivityLogs, deleteActivityLog, clearActivityLogs } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../auth-provider';

const ActivityLogPage: FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | boolean>(false);
    const { toast } = useToast();
    const { userRole } = useAuth();

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const logsData = await getActivityLogs();
            setLogs(logsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (error) {
            toast({ title: "Error", description: "Gagal memuat log aktivitas.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [toast]);

    const handleDelete = async (id: string) => {
        setIsDeleting(id);
        try {
            await deleteActivityLog(id);
            setLogs(prev => prev.filter(log => log.id !== id));
            toast({ title: "Log Dihapus", description: "Log aktivitas telah dihapus." });
        } catch (error) {
             toast({ title: "Error", description: "Gagal menghapus log.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    }

    const handleClearAll = async () => {
        if (!userRole) return;
        setIsDeleting(true);
        try {
            await clearActivityLogs(userRole);
            await fetchLogs(); // refetch logs, which will now just contain the "cleared all" log
            toast({ title: "Semua Log Dihapus", description: "Riwayat log aktivitas telah dibersihkan." });
        } catch (error) {
            toast({ title: "Error", description: "Gagal menghapus semua log.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    }


    if (loading) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-6">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2 flex-grow">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                 <div>
                    <h1 className="text-2xl font-bold">Log Aktivitas</h1>
                    <p className="text-muted-foreground">Riwayat semua aktivitas penting yang terjadi di aplikasi.</p>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={logs.length === 0 || !!isDeleting}>
                            {isDeleting === true ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Hapus Semua
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tindakan ini akan menghapus semua riwayat aktivitas secara permanen. Tindakan ini tidak dapat diurungkan.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">
                                Ya, Hapus Semua
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <Card>
                <CardContent className="p-4 md:p-6">
                    {logs.length > 0 ? (
                        <ScrollArea className="h-[calc(100vh-18rem)]">
                            <div className="pr-4">
                            {logs.map((log, index) => (
                                <div key={log.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-x-4">
                                     <div className="flex flex-col items-center self-stretch">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                            <History className="h-4 w-4 text-primary" />
                                        </div>
                                        {index < logs.length - 1 && (
                                            <div className="w-px flex-1 bg-border" />
                                        )}
                                    </div>
                                    <div className="pb-8">
                                        <p className="text-sm">
                                            <span className="font-semibold capitalize">{log.user}</span>
                                            {` ${log.description}`}
                                        </p>
                                        <time className="text-xs text-muted-foreground">
                                            {new Date(log.date).toLocaleString('id-ID', {
                                                dateStyle: 'long',
                                                timeStyle: 'short',
                                            })}
                                        </time>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" disabled={!!isDeleting}>
                                                {isDeleting === log.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Hapus Log Ini?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                   Tindakan ini akan menghapus log aktivitas ini secara permanen. Apakah Anda yakin?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(log.id)} className="bg-destructive hover:bg-destructive/90">
                                                    Hapus
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex h-60 flex-col items-center justify-center text-center">
                            <History className="h-12 w-12 text-muted-foreground/50" />
                            <h3 className="mt-4 text-lg font-semibold">Belum Ada Aktivitas</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Log akan muncul di sini setelah ada aktivitas di aplikasi.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ActivityLogPage;
