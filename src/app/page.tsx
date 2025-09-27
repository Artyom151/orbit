
'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, User, Loader2 } from 'lucide-react';
import { signInWithGoogle } from '@/lib/auth-service';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M21.9999 12.2273C21.9999 11.4545 21.9317 10.6818 21.8067 9.95455H12.2272V14.2045H17.7613C17.5363 15.5455 16.7635 16.7045 15.6022 17.4773V20.25L19.3067 20.2591C20.9908 18.6818 21.9999 16.0227 21.9999 12.2273Z" fill="#4285F4"/>
        <path d="M12.2272 22C15.0908 22 17.5135 21.0455 19.3067 19.4545L15.6022 16.6818C14.6476 17.3182 13.5226 17.7273 12.2272 17.7273C9.64762 17.7273 7.45445 16.0227 6.64762 13.8182H2.82945V16.7045C4.60218 20.0455 8.12718 22 12.2272 22Z" fill="#34A853"/>
        <path d="M6.64773 13.8182C6.42273 13.1818 6.29773 12.5 6.29773 11.8182C6.29773 11.1364 6.42273 10.4545 6.64773 9.81818V6.93182H2.82955C2.05682 8.45455 1.63636 10.0909 1.63636 11.8182C1.63636 13.5455 2.05682 15.1818 2.82955 16.7045L6.64773 13.8182Z" fill="#FBBC05"/>
        <path d="M12.2272 5.90909C13.6817 5.90909 14.909 6.38636 15.9317 7.34091L19.3772 3.89545C17.5044 2.18182 15.0908 1.18182 12.2272 1.18182C8.12718 1.18182 4.60218 3.59091 2.82945 6.93182L6.64762 9.81818C7.45445 7.61364 9.64762 5.90909 12.2272 5.90909Z" fill="#EA4335"/>
    </svg>
);

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  };
  
  if (loading || user) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p>Loading...</p>
            </div>
        </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex flex-1 flex-col items-center justify-center bg-card p-8">
        <div className="w-full max-w-sm">
          <div className="text-left mb-8">
            <h2 className="text-3xl font-bold text-white">Login to your Account</h2>
            <p className="text-gray-400 mt-2">
              Welcome back! Please enter your details.
            </p>
          </div>
          <form className="grid gap-6">
            <div className="grid gap-2">
              <label className="text-sm text-gray-400" htmlFor="email">
                Email or Username
              </label>
              <Input
                id="email"
                type="email"
                placeholder=""
                className="bg-background border-none text-white placeholder:text-gray-500 h-12"
              />
            </div>
            <div className="grid gap-2 relative">
              <label className="text-sm text-gray-400" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder=""
                className="bg-background border-none text-white placeholder:text-gray-500 h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
               <Link href="#" className="text-right text-sm text-primary hover:underline">
                  Forgot password?
               </Link>
            </div>
            <Button className="w-full text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground" type="button" disabled>
                Sign in
            </Button>
          </form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-gray-400">
                or
              </span>
            </div>
          </div>
          <Button className="w-full text-lg py-6" variant="outline" onClick={handleGoogleSignIn}>
            <GoogleIcon className="mr-2" />
            Sign in with Google
          </Button>
          <p className="text-center text-sm text-gray-400 mt-8">
            Don't have an account?{' '}
            <Link href="#" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-background p-8 text-white">
        <div className="flex flex-col items-center text-center max-w-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h1 className="text-4xl font-bold mt-6">Orbit</h1>
          <p className="mt-4 text-center text-lg text-gray-300">
            Join our community and discover new opportunities.
          </p>
          <Button variant="outline" className="mt-8 bg-transparent border-white/50 hover:bg-white/10">
            Learn more about Orbit
          </Button>
          <div className="flex gap-3 mt-12">
            <div className="h-2.5 w-2.5 rounded-full bg-white/50"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-white/50"></div>
            <div className="h-2.5 w-5 rounded-full bg-white"></div>
          </div>
        </div>
      </div>
    </main>
  );
}
