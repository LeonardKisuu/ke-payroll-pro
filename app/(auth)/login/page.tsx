'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Invalid credentials');
        return;
      }

      toast.success('Login successful');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1B3A6B] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="w-12 h-12"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="4" y="8" width="40" height="32" rx="4" stroke="#C9A046" strokeWidth="2.5" fill="none" />
              <path d="M4 16h40" stroke="#C9A046" strokeWidth="2" />
              <path d="M16 16v24" stroke="#C9A046" strokeWidth="2" />
              <circle cx="10" cy="12" r="1.5" fill="#C9A046" />
              <circle cx="15" cy="12" r="1.5" fill="#C9A046" />
              <circle cx="20" cy="12" r="1.5" fill="#C9A046" />
              <text x="24" y="33" textAnchor="middle" fill="#C9A046" fontSize="10" fontWeight="bold" fontFamily="sans-serif">KES</text>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">KE Payroll Pro</h1>
          <p className="text-white/60 text-sm mt-1">Taxwise Africa Consulting LLP</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-4 pt-6 px-6">
            <h2 className="text-xl font-semibold text-center text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground text-center">Sign in to your payroll account</p>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 px-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 px-6 pb-6">
              <Button
                type="submit"
                className="w-full bg-[#1B3A6B] hover:bg-[#152d54] text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-white/40 text-xs mt-6">
          Powered by Taxwise Africa Consulting LLP
        </p>
      </div>
    </div>
  );
}
