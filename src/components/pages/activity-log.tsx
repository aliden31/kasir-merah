
'use client';

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Timeline, TimelineItem, TimelineConnector, TimelineHeader, TimelineIcon, TimelineTitle, TimelineBody } from '@/components/ui/timeline';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ActivityLog } from '@/lib/types';
import { getActivityLogs } from '@/lib/data-service';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';

const ActivityLogPage: FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
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
        fetchLogs();
    }, [toast]);

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
            <div>
                <h1 className="text-2xl font-bold">Log Aktivitas</h1>
                <p className="text-muted-foreground">Riwayat semua aktivitas penting yang terjadi di aplikasi.</p>
            </div>
            <Card>
                <CardContent className="p-4 md:p-6">
                    {logs.length > 0 ? (
                        <ScrollArea className="h-[calc(100vh-15rem)]">
                            <div className="pr-4">
                            {logs.map((log, index) => (
                                <div key={log.id} className="grid grid-cols-[auto_1fr] gap-x-4">
                                     <div className="flex flex-col items-center">
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
