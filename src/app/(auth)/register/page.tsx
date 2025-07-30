'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { register } from '@/lib/auth-service';
import { UserRole } from '@/lib/types';
import { Loader2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('kasir');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, role);
      router.push('/');
      toast({
        title: 'Pendaftaran Berhasil',
        description: `Akun Anda sebagai ${role} telah berhasil dibuat.`,
      });
    } catch (error: any) {
      toast({
        title: 'Pendaftaran Gagal',
        description: error.message || 'Terjadi kesalahan saat mendaftar.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={handleRegister}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Buat Akun Baru</CardTitle>
          <CardDescription>Daftarkan diri Anda untuk mulai menggunakan aplikasi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@contoh.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Peran</Label>
            <RadioGroup
              defaultValue="kasir"
              className="flex gap-4"
              onValueChange={(value: UserRole) => setRole(value)}
              value={role}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kasir" id="role-kasir" />
                <Label htmlFor="role-kasir">Kasir</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="admin" id="role-admin" />
                <Label htmlFor="role-admin">Admin</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Daftar
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Sudah punya akun?{' '}
            <Link href="/login" className="underline hover:text-primary">
              Masuk di sini
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
