
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { isUsernameTaken, updateUserProfile } from '@/lib/auth-service';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Avatar as UiAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AnimatedBanner } from '@/components/animated-banner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function OnboardingPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [gradientColors, setGradientColors] = useState<string[] | undefined>(['#a855f7', '#6366f1']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const debouncedUsername = useDebounce(username, 500);

  useEffect(() => {
    if (user) {
        setName(user.displayName || '');
        const initialUsername = user.email?.split('@')[0] || '';
        setUsername(initialUsername);
        setAvatarPreview(user.photoURL || null);
    }
  }, [user]);

  useEffect(() => {
    const checkUsername = async () => {
      if (debouncedUsername.length < 3) {
        setUsernameStatus('idle');
        return;
      }
      if (debouncedUsername === user?.username) {
        setUsernameStatus('available');
        return;
      }
      setUsernameStatus('checking');
      const isTaken = await isUsernameTaken(debouncedUsername);
      setUsernameStatus(isTaken ? 'taken' : 'available');
    };
    checkUsername();
  }, [debouncedUsername, user?.username]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        setAvatarPreview(dataUri);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleFinish = async () => {
    if (!user || usernameStatus !== 'available') return;
    setIsSubmitting(true);
    try {
      await updateUserProfile(user.uid, {
        name,
        username,
        bio,
        avatar: avatarPreview,
        coverPhoto: gradientColors ? JSON.stringify(gradientColors) : undefined,
        onboardingCompleted: true,
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const isVideoAvatar = avatarPreview && avatarPreview.startsWith('data:video');
  const isButtonDisabled = isSubmitting || !name || !username || usernameStatus !== 'available';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2">Welcome to Orbit, {user.displayName}!</h1>
        <p className="text-muted-foreground text-center mb-8">Let's set up your profile.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6 flex flex-col items-center">
            <h2 className="text-2xl font-semibold text-center">1. Customize your identity</h2>
             <div className='relative w-40 h-40 group'>
              <UiAvatar className="w-40 h-40 text-4xl">
                 {isVideoAvatar ? (
                  <video src={avatarPreview} loop autoPlay muted className="w-full h-full object-cover" />
                ) : (
                  <AvatarImage src={avatarPreview || undefined} />
                )}
                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
              </UiAvatar>
              <button 
                type="button" 
                onClick={() => avatarInputRef.current?.click()}
                className='absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
              >
                  <Camera className='text-white w-12 h-12'/>
              </button>
              <Input 
                type="file" 
                accept="image/*,video/*"
                className='hidden' 
                ref={avatarInputRef} 
                onChange={handleAvatarChange}
              />
            </div>
             <div className="space-y-4 w-full max-w-sm">
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="name">Display Name</Label>
                    <Input type="text" id="name" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                 <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                        <Input type="text" id="username" placeholder="your_username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {usernameStatus === 'checking' && <Loader2 className="animate-spin text-muted-foreground" />}
                            {usernameStatus === 'available' && username.length >=3 && <CheckCircle className="text-green-500" />}
                            {usernameStatus === 'taken' && <XCircle className="text-destructive" />}
                        </div>
                    </div>
                     {usernameStatus === 'taken' && <p className="text-sm text-destructive">This username is already taken.</p>}
                     {username.length > 0 && username.length < 3 && <p className="text-sm text-muted-foreground">Username must be at least 3 characters.</p>}
                </div>
                 <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" placeholder="Tell us about yourself..." value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-center">2. Preview your profile</h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="relative h-32 w-full">
                <AnimatedBanner color={gradientColors} />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <UiAvatar className="h-24 w-24 border-4 border-background -mt-16">
                     {isVideoAvatar ? (
                        <video src={avatarPreview} loop autoPlay muted className="w-full h-full object-cover" />
                      ) : (
                        <AvatarImage src={avatarPreview || undefined} />
                      )}
                    <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                  </UiAvatar>
                </div>
                <div className="pt-2">
                  <h1 className="text-xl font-bold">{name || "Your Name"}</h1>
                  <p className={cn("text-muted-foreground", usernameStatus === 'taken' && 'text-destructive')}>@{username || "your_username"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{bio || "Your bio will appear here."}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Button size="lg" onClick={handleFinish} disabled={isButtonDisabled}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Finish Setup & Enter Orbit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
