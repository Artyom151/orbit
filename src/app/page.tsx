
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { signInWithGoogle, signInWithEmailAndPassword, signUpWithEmailAndPassword } from '@/lib/auth-service';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M21.9999 12.2273C21.9999 11.4545 21.9317 10.6818 21.8067 9.95455H12.2272V14.2045H17.7613C17.5363 15.5455 16.7635 16.7045 15.6022 17.4773V20.25L19.3067 20.2591C20.9908 18.6818 21.9999 16.0227 21.9999 12.2273Z" fill="#4285F4"/>
        <path d="M12.2272 22C15.0908 22 17.5135 21.0455 19.3067 19.4545L15.6022 16.6818C14.6476 17.3182 13.5226 17.7273 12.2272 17.7273C9.64762 17.7273 7.45445 16.0227 6.64762 13.8182H2.82945V16.7045C4.60218 20.0455 8.12718 22 12.2272 22Z" fill="#34A853"/>
        <path d="M6.64773 13.8182C6.42273 13.1818 6.29773 12.5 6.29773 11.8182C6.29773 11.1364 6.42273 10.4545 6.64773 9.81818V6.93182H2.82955C2.05682 8.45455 1.63636 10.0909 1.63636 11.8182C1.63636 13.5455 2.05682 15.1818 2.82955 16.7045L6.64773 13.8182Z" fill="#FBBC05"/>
        <path d="M12.2272 5.90909C13.6817 5.90909 14.909 6.38636 15.9317 7.34091L19.3772 3.89545C17.5044 2.18182 15.0908 1.18182 12.2272 1.18182C8.12718 1.18182 4.60218 3.59091 2.82945 6.93182L6.64762 9.81818C7.45445 7.61364 9.64762 5.90909 12.2272 5.90909Z" fill="#EA4335"/>
    </svg>
);

export default function LoginPage() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
        router.push('/dashboard');
    }
  }, [user, router]);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
        toast({ variant: 'destructive', title: 'Missing fields', description: 'Please enter both email and password.' });
        return;
    }
    if (!isLoginView && password !== confirmPassword) {
        toast({ variant: 'destructive', title: 'Passwords do not match' });
        return;
    }

    setIsSubmitting(true);
    try {
        if (isLoginView) {
            await signInWithEmailAndPassword(email, password);
        } else {
            await signUpWithEmailAndPassword(email, password);
            toast({
                title: 'Account Created!',
                description: 'You can now sign in.'
            });
            setIsLoginView(true);
        }
    } catch (error: any) {
        let message = "An unexpected error occurred.";
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
                message = "Incorrect email or password. Please try again.";
                break;
            case 'auth/wrong-password':
                message = "Incorrect password. Please try again.";
                break;
            case 'auth/email-already-in-use':
                message = "This email is already registered. Please log in.";
                break;
            case 'auth/weak-password':
                message = "The password is too weak. It should be at least 6 characters.";
                break;
            default:
                console.error(error);
        }
        toast({ variant: 'destructive', title: 'Authentication Failed', description: message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
        await signInWithGoogle();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Google Sign-In Failed' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (loading || user) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p>Loading...</p>
            </div>
        </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 font-body overflow-hidden">
        <div className="absolute inset-0 -z-20 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]"></div>
        <div className="absolute -top-1/2 -z-10 animate-gradient-animation-slow" style={{ animationDelay: '0s'}}>
            <div className="h-[400px] w-[400px] rounded-full bg-primary/20 blur-[150px] "></div>
        </div>
        <div className="absolute -bottom-1/2 -right-1/4 -z-10 animate-gradient-animation-slow" style={{ animationDelay: '2s'}}>
            <div className="h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[150px] "></div>
        </div>
         <div className="absolute -bottom-1/4 -left-1/4 -z-10 animate-gradient-animation-slow" style={{ animationDelay: '4s'}}>
            <div className="h-[300px] w-[600px] rounded-full bg-blue-500/20 blur-[150px] "></div>
        </div>

        <div className="w-full max-w-sm space-y-6 animate-fade-in-up">
            <div className="text-center">
                <div className="inline-block p-3 rounded-full bg-card/80 backdrop-blur-sm border mb-4">
                    <Logo className="h-12 w-12" />
                </div>
                <h1 className="text-4xl font-bold font-headline">
                    {isLoginView ? "Welcome Back to Orbit" : "Join the Orbit"}
                </h1>
                <p className="text-muted-foreground mt-2">
                    {isLoginView ? "Sign in to continue your journey." : "Create an account to start exploring."}
                </p>
            </div>

            <div className="bg-card/80 backdrop-blur-sm border rounded-xl p-6 shadow-2xl shadow-black/10">
                <form onSubmit={handleAuthAction} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                            id="email"
                            type="email"
                            placeholder="Email"
                            className="pl-10 h-12 bg-background/50"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className="pl-10 pr-10 h-12 bg-background/50"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {!isLoginView && (
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="confirm-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm Password"
                                className="pl-10 pr-10 h-12 bg-background/50"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    
                    <Button className="w-full text-lg py-6" type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="animate-spin mr-2"/>}
                        {isLoginView ? "Sign In" : "Sign Up"}
                    </Button>
                </form>
                
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                </div>

                <Button className="w-full text-lg py-6" variant="outline" onClick={handleGoogleSignIn} disabled={isSubmitting}>
                    <GoogleIcon className="mr-2" />
                    Sign in with Google
                </Button>
            </div>


            <p className="text-center text-sm text-muted-foreground">
                {isLoginView ? "Don't have an account?" : "Already have an account?"}{' '}
                <button onClick={() => setIsLoginView(!isLoginView)} className="font-semibold text-primary hover:underline">
                    {isLoginView ? "Sign up" : "Sign in"}
                </button>
            </p>
        </div>
    </main>
  );
}
