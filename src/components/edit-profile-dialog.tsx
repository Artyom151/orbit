'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { isUsernameTaken, updateUserProfile } from '@/lib/auth-service';
import type { User, Track, ProfileTheme } from '@/lib/types';
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Camera, Music, Wand2, X, User as UserIcon, Palette, Music2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { AnimatedBanner } from './animated-banner';
import { SelectProfileSongDialog } from './profile/select-profile-song-dialog';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

type EditProfileDialogProps = {
  user: User;
  children: React.ReactNode;
};

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

export function EditProfileDialog({ user, children }: EditProfileDialogProps) {
  const { user: authUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverPhotoData, setCoverPhotoData] = useState<string | undefined>(user.coverPhoto);
  const [gradientColors, setGradientColors] = useState<string[] | undefined>();
  const [videoBanner, setVideoBanner] = useState<string | undefined>();
  const [imageBanner, setImageBanner] = useState<string | undefined>();
  
  const [profileBackground, setProfileBackground] = useState<string | null>(user.profileBackground || null);
  const backgroundInputRef = React.useRef<HTMLInputElement>(null);


  const [profileSong, setProfileSong] = useState<Track | null>(user.profileSong || null);
  const [storyBorder, setStoryBorder] = useState<User['storyBorder']>(user.storyBorder || 'none');
  const [profileTheme, setProfileTheme] = useState<User['profileTheme']>(user.profileTheme || 'default');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSongDialogOpen, setIsSongDialogOpen] = useState(false);
  
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const debouncedUsername = useDebounce(username, 500);
  
  // Custom theme colors
  const [customThemePrimary, setCustomThemePrimary] = useState('#6D28D9');
  const [customThemeBackground, setCustomThemeBackground] = useState('#111827');
  const [customThemeAccent, setCustomThemeAccent] = useState('#F472B6');


  useEffect(() => {
    const checkUsername = async () => {
      if (debouncedUsername.length < 3) {
        setUsernameStatus('idle');
        return;
      }
      // If the username is the user's current one, it's available for them.
      if (debouncedUsername === user.username) {
        setUsernameStatus('available');
        return;
      }
      setUsernameStatus('checking');
      const isTaken = await isUsernameTaken(debouncedUsername);
      setUsernameStatus(isTaken ? 'taken' : 'available');
    };
    if (isOpen) {
      checkUsername();
    }
  }, [debouncedUsername, user.username, isOpen]);

  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const bannerImageInputRef = React.useRef<HTMLInputElement>(null);
  const bannerVideoInputRef = React.useRef<HTMLInputElement>(null);
  const [color1, setColor1] = useState('#a855f7');
  const [color2, setColor2] = useState('#6366f1');
  
  const getInitialBannerType = () => {
    if (!user.coverPhoto) return 'gradient';
    if (user.coverPhoto === 'glass') return 'glass';
    if (user.coverPhoto.startsWith('data:video')) return 'video';
    if (user.coverPhoto.startsWith('data:image')) return 'image';
    if (user.coverPhoto.startsWith('http')) return 'image';
    if (user.coverPhoto.startsWith('["#')) return 'gradient';
    return 'gradient';
  }

  const [bannerType, setBannerType] = useState(getInitialBannerType());

  // State for custom border
  const [customBorderColor1, setCustomBorderColor1] = useState('#ff0000');
  const [customBorderColor2, setCustomBorderColor2] = useState('#0000ff');
  const [customBorderGlow, setCustomBorderGlow] = useState('#00ffff');

  useEffect(() => {
    if (user.coverPhoto) {
        setGradientColors(undefined);
        setVideoBanner(undefined);
        setImageBanner(undefined);

        if (user.coverPhoto.startsWith('data:video')) {
            setVideoBanner(user.coverPhoto);
            setBannerType('video');
        } else if (user.coverPhoto.startsWith('data:image')) {
            setImageBanner(user.coverPhoto);
            setBannerType('image');
        } else if (user.coverPhoto.startsWith('["#')) {
            try {
                const colors = JSON.parse(user.coverPhoto);
                setGradientColors(colors);
                setColor1(colors[0]);
                setColor2(colors[1]);
                setBannerType('gradient');
            } catch {}
        } else if (user.coverPhoto.startsWith('http')) {
            setImageBanner(user.coverPhoto);
            setBannerType('image');
        } else if (user.coverPhoto === 'glass') {
            setBannerType('glass');
        }
    }
    if (typeof user.storyBorder === 'object') {
        setStoryBorder('custom');
        if (user.storyBorder.gradient) {
            setCustomBorderColor1(user.storyBorder.gradient[0]);
            setCustomBorderColor2(user.storyBorder.gradient[1]);
        }
        if (user.storyBorder.glow) {
            setCustomBorderGlow(user.storyBorder.glow);
        }
    }
    if (typeof user.profileTheme === 'object' && user.profileTheme.name === 'custom') {
        setProfileTheme('custom');
        setCustomThemePrimary(user.profileTheme.colors.primary);
        setCustomThemeBackground(user.profileTheme.colors.background);
        setCustomThemeAccent(user.profileTheme.colors.accent);
    } else if (typeof user.profileTheme === 'string') {
        setProfileTheme(user.profileTheme || 'default');
    }
    
  }, [user]);


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
  
  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const dataUri = reader.result as string;
              setImageBanner(dataUri);
              setCoverPhotoData(dataUri);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleBannerVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUri = reader.result as string;
            setVideoBanner(dataUri);
            setCoverPhotoData(dataUri);
        };
        reader.readAsDataURL(file);
    }
  }

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileBackground(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };
  
  const handleColorChange = (colorValue1: string, colorValue2: string) => {
    setColor1(colorValue1);
    setColor2(colorValue2);
    setGradientColors([colorValue1, colorValue2]);
    setCoverPhotoData(JSON.stringify([colorValue1, colorValue2]));
  }

  const handleSelectSong = (track: Track) => {
    setProfileSong(track);
    setIsSongDialogOpen(false);
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || usernameStatus !== 'available') return;
    
    setIsSubmitting(true);
    
    let finalCoverPhoto = coverPhotoData;
    if (bannerType === 'gradient') {
      finalCoverPhoto = JSON.stringify(gradientColors);
    } else if (bannerType === 'image') {
      finalCoverPhoto = imageBanner;
    } else if (bannerType === 'video') {
      finalCoverPhoto = videoBanner;
    } else if (bannerType === 'glass') {
      finalCoverPhoto = 'glass';
    }

    try {
        let borderData: User['storyBorder'] = storyBorder;
        if (storyBorder === 'custom') {
            borderData = {
                gradient: [customBorderColor1, customBorderColor2],
                glow: customBorderGlow
            }
        }
        
        let themeData: User['profileTheme'] = profileTheme;
        if (profileTheme === 'custom') {
            themeData = {
                name: 'custom',
                colors: {
                    primary: customThemePrimary,
                    background: customThemeBackground,
                    accent: customThemeAccent,
                }
            }
        }

        await updateUserProfile(authUser.uid, {
            name,
            username,
            bio,
            avatar: avatarPreview,
            coverPhoto: finalCoverPhoto,
            profileBackground: profileBackground || undefined,
            profileSong: profileSong,
            storyBorder: borderData,
            profileTheme: themeData,
        });

        toast({
            title: 'Profile Updated',
            description: 'Your profile has been successfully updated.',
        });
        
        if (username !== user.username) {
            router.push(`/dashboard/profile/${username}`);
        }
        
        setIsOpen(false);
    } catch (error) {
         toast({
            variant: "destructive",
            title: 'Update Failed',
            description: 'Could not update your profile. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isVideoAvatar = avatarPreview?.startsWith('data:video');
  const isButtonDisabled = isSubmitting || !name || !username || usernameStatus !== 'available';


  if (!authUser || authUser.uid !== user.id) {
    return null;
  }

  return (
    <>
    <SelectProfileSongDialog 
        open={isSongDialogOpen}
        onOpenChange={setIsSongDialogOpen}
        onSelectTrack={handleSelectSong}
    />
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl p-0 h-full sm:h-auto overflow-hidden flex flex-col">
        <DialogHeader className="p-6 flex-shrink-0 border-b">
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-grow overflow-hidden flex flex-col">
          <div className="flex-grow overflow-auto">
            <Tabs defaultValue="profile" className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-0 sm:gap-6 h-full">
              <TabsList className="flex-shrink-0 flex flex-row sm:flex-col h-auto justify-start items-stretch bg-transparent p-0 sm:pl-6 border-b sm:border-b-0 sm:border-r">
                  <TabsTrigger value="profile" className="justify-start rounded-none sm:rounded-md data-[state=active]:shadow-none data-[state=active]:bg-accent text-sm sm:text-base px-2 py-3 sm:px-4">
                      <UserIcon className="mr-2"/>Profile
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="justify-start rounded-none sm:rounded-md data-[state=active]:shadow-none data-[state=active]:bg-accent text-sm sm:text-base px-2 py-3 sm:px-4">
                      <Palette className="mr-2"/>Appearance
                  </TabsTrigger>
                  <TabsTrigger value="music" className="justify-start rounded-none sm:rounded-md data-[state=active]:shadow-none data-[state=active]:bg-accent text-sm sm:text-base px-2 py-3 sm:px-4">
                      <Music2 className="mr-2"/>Music
                  </TabsTrigger>
              </TabsList>

              <div className="pr-0 sm:pr-6 sm:pb-6 h-full overflow-y-auto flex-grow">
                <div className="p-6 sm:p-0 h-full">
                  <TabsContent value="profile" className="mt-0 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="relative">
                          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {usernameStatus === 'checking' && <Loader2 className="animate-spin text-muted-foreground" />}
                              {usernameStatus === 'available' && username.length >=3 && <CheckCircle className="text-green-500" />}
                              {usernameStatus === 'taken' && <XCircle className="text-destructive" />}
                          </div>
                        </div>
                        {usernameStatus === 'taken' && <p className="text-sm text-destructive">This username is already taken.</p>}
                        {username.length > 0 && username.length < 3 && <p className="text-sm text-muted-foreground">Username must be at least 3 characters.</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                    </div>
                  </TabsContent>

                  <TabsContent value="appearance" className="mt-0 space-y-6">
                    <div className="space-y-2">
                        <Label>Avatar</Label>
                        <div className='relative w-24 h-24 group'>
                            <Avatar className="w-24 h-24 border-2">
                                {isVideoAvatar ? (
                                  <video src={avatarPreview!} loop autoPlay muted className="w-full h-full object-cover" />
                                ) : (
                                  <AvatarImage src={avatarPreview || undefined} />
                                )}
                                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <button 
                                type="button" 
                                onClick={() => avatarInputRef.current?.click()}
                                className='absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                            >
                                <Camera className='text-white'/>
                            </button>
                            <Input 
                                type="file" 
                                accept="image/*,video/*" 
                                className='hidden' 
                                ref={avatarInputRef} 
                                onChange={handleAvatarChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Banner</Label>
                        <div className="relative h-24 w-full rounded-md overflow-hidden border">
                            {bannerType === 'glass' ? (
                                <div className="h-full w-full bg-black/10 backdrop-blur-md border border-white/10"></div>
                            ) : bannerType === 'image' && imageBanner ? (
                              <Image src={imageBanner} alt="Banner preview" fill className="object-cover" />
                            ) : (
                              <AnimatedBanner videoUrl={bannerType === 'video' ? videoBanner : undefined} color={bannerType === 'gradient' ? gradientColors : undefined} />
                            )}
                        </div>
                        <div className='space-y-4 pt-2'>
                            <RadioGroup value={bannerType} className="flex gap-4 flex-wrap" onValueChange={setBannerType}>
                              <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="gradient" id="r2" />
                                  <Label htmlFor="r2">Gradient</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="image" id="r3" />
                                  <Label htmlFor="r3">Image</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="video" id="r4" />
                                  <Label htmlFor="r4">Video</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="glass" id="r5" />
                                  <Label htmlFor="r5">Glass</Label>
                              </div>
                            </RadioGroup>
                            
                            {bannerType === 'gradient' && (
                                <div className='flex items-center gap-2'>
                                    <Input type="color" value={color1} onChange={(e) => handleColorChange(e.target.value, color2)} />
                                    <Input type="color" value={color2} onChange={(e) => handleColorChange(color1, e.target.value)} />
                                </div>
                            )}
                            {bannerType === 'image' && (
                                  <div>
                                      <Input type="file" accept="image/*,image/gif" className='hidden' ref={bannerImageInputRef} onChange={handleBannerImageChange} />
                                      <Button type="button" variant="outline" onClick={() => bannerImageInputRef.current?.click()}>Upload Image</Button>
                                  </div>
                            )}
                            {bannerType === 'video' && (
                                <div>
                                    <Input type="file" accept="video/*" className='hidden' ref={bannerVideoInputRef} onChange={handleBannerVideoChange} />
                                    <Button type="button" variant="outline" onClick={() => bannerVideoInputRef.current?.click()}>Upload Video</Button>
                                </div>
                            )}
                        </div>
                    </div>

                     <div className="space-y-2">
                          <Label>Profile Background</Label>
                           {profileBackground && (
                               <div className="relative h-24 w-full rounded-md overflow-hidden border">
                                  {profileBackground.startsWith('data:video') ? (
                                      <video src={profileBackground} loop autoPlay muted className="w-full h-full object-cover" />
                                  ) : (
                                      <Image src={profileBackground} alt="Profile background preview" fill className="object-cover" />
                                  )}
                                  <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setProfileBackground(null)}>
                                      <X className="size-4" />
                                  </Button>
                               </div>
                           )}
                          <div>
                              <Input type="file" accept="image/*,video/*,image/gif" className="hidden" ref={backgroundInputRef} onChange={handleBackgroundChange} />
                              <Button type="button" variant="outline" onClick={() => backgroundInputRef.current?.click()}>
                                  {profileBackground ? "Change" : "Upload"} Background
                              </Button>
                          </div>
                      </div>


                    <div className="space-y-2">
                        <Label htmlFor="storyBorder">Story Ring Border</Label>
                        <Select value={typeof storyBorder === 'object' ? 'custom' : storyBorder} onValueChange={(value) => setStoryBorder(value as User['storyBorder'])}>
                            <SelectTrigger id="storyBorder">
                                <SelectValue placeholder="Select a border" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Default</SelectItem>
                                <SelectItem value="rainbow">Rainbow</SelectItem>
                                <SelectItem value="gold">Gold</SelectItem>
                                <SelectItem value="neon">Neon</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {storyBorder === 'custom' && (
                        <div className="space-y-4 border p-4 rounded-md">
                            <h4 className="font-medium text-sm">Custom Story Ring</h4>
                            <div className='flex items-center gap-4'>
                                <div className='space-y-2 flex-1'>
                                    <Label>Gradient</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="color" value={customBorderColor1} onChange={(e) => setCustomBorderColor1(e.target.value)} />
                                        <Input type="color" value={customBorderColor2} onChange={(e) => setCustomBorderColor2(e.target.value)} />
                                    </div>
                                </div>
                                 <div className='space-y-2'>
                                    <Label>Glow</Label>
                                    <Input type="color" value={customBorderGlow} onChange={(e) => setCustomBorderGlow(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-center pt-2">
                                <div className="relative">
                                    <Avatar className="h-16 w-16 border-2 border-transparent">
                                        <AvatarImage src={avatarPreview || undefined} />
                                        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                     <div 
                                        className="absolute inset-[-3px] rounded-full -z-10"
                                        style={{
                                            background: `linear-gradient(to bottom right, ${customBorderColor1}, ${customBorderColor2})`,
                                            boxShadow: `0 0 10px 1px ${customBorderGlow}`
                                        }}
                                     />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="profileTheme">Profile Theme</Label>
                        <Select value={typeof profileTheme === 'object' ? 'custom' : profileTheme} onValueChange={(value) => setProfileTheme(value as ProfileTheme)}>
                            <SelectTrigger id="profileTheme">
                                <SelectValue placeholder="Select a theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">Default</SelectItem>
                                <SelectItem value="ocean">Ocean</SelectItem>
                                <SelectItem value="sunset">Sunset</SelectItem>
                                <SelectItem value="forest">Forest</SelectItem>
                                <SelectItem value="matrix">Matrix</SelectItem>
                                <SelectItem value="sakura">Sakura</SelectItem>
                                <SelectItem value="dracula">Dracula</SelectItem>
                                <SelectItem value="retro">Retro</SelectItem>
                                <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     {profileTheme === 'custom' && (
                        <div className="space-y-4 border p-4 rounded-md">
                            <h4 className="font-medium text-sm">Custom Theme Colors</h4>
                             <div className='space-y-2'>
                                <Label>Primary</Label>
                                <Input type="color" value={customThemePrimary} onChange={(e) => setCustomThemePrimary(e.target.value)} />
                            </div>
                             <div className='space-y-2'>
                                <Label>Background</Label>
                                <Input type="color" value={customThemeBackground} onChange={(e) => setCustomThemeBackground(e.target.value)} />
                            </div>
                             <div className='space-y-2'>
                                <Label>Accent</Label>
                                <Input type="color" value={customThemeAccent} onChange={(e) => setCustomThemeAccent(e.target.value)} />
                            </div>
                        </div>
                     )}

                  </TabsContent>

                  <TabsContent value="music" className="mt-0 space-y-6">
                    <div className="space-y-2">
                        <Label>Profile Song</Label>
                        {profileSong ? (
                            <div className="flex items-center gap-2 p-2 border rounded-md">
                                <Image src={profileSong.artworkUrl100} alt={profileSong.trackName} width={40} height={40} className="rounded" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{profileSong.trackName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{profileSong.artistName}</p>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setProfileSong(null)}>
                                    <X className="size-4"/>
                                </Button>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground pt-2">No song selected.</p>
                        )}
                        <Button type="button" variant="outline" onClick={() => setIsSongDialogOpen(true)}>
                            <Music className="mr-2" />
                            {profileSong ? "Change Song" : "Select Song"}
                        </Button>
                    </div>
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>
          
          <DialogFooter className="border-t p-6 flex-shrink-0">
            <DialogClose asChild>
                <Button type="button" variant="secondary">
                    Cancel
                </Button>
            </DialogClose>
            <Button type="submit" disabled={isButtonDisabled}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
