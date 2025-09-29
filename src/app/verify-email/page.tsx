
'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { signOut } from '@/lib/auth-service';

export default function VerifyEmailPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/'); // Not logged in, go to login page
      } else {
        router.push('/dashboard'); // Just go to dashboard
      }
    }
  }, [user, loading, router]);
  
  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p>Redirecting...</p>
        </div>
    </div>
  );
}
