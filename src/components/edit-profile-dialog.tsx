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
import { updateUserProfile } from '@/lib/auth-service';
import type { User, Track } from '@/lib/types';
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Camera, Music, Wand2, X, User as UserIcon, Palette, Music2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { extractColors } from '@/ai/flows/extract-colors-flow';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { AnimatedBanner } from './animated-banner';
import { SelectProfileSongDialog } from './profile/select-profile-song-dialog';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';

type EditProfileDialogProps = {
  user: User;
  children: React.ReactNode;
};

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
  const [profileSong, setProfileSong] = useState<Track | null>(user.profileSong || null);
  const [profileBorder, setProfileBorder] = useState<User['profileBorder']>(user.profileBorder || 'none');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [isSongDialogOpen, setIsSongDialogOpen] = useState(false);

  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const bannerVideoInputRef = React.useRef<HTMLInputElement>(null);
  const [color1, setColor1] = useState('#a855f7');
  const [color2, setColor2] = useState('#6366f1');
  const [bannerType, setBannerType] = useState('gradient');

  // State for custom border
  const [customBorderColor1, setCustomBorderColor1] = useState('#ff0000');
  const [customBorderColor2, setCustomBorderColor2] = useState('#0000ff');
  const [customBorderGlow, setCustomBorderGlow] = useState('#00ffff');

  useEffect(() => {
    if (user.coverPhoto) {
        if(user.coverPhoto.startsWith('data:video')) {
            setBannerType('video');
            setVideoBanner(user.coverPhoto);
        } else if (user.coverPhoto.startsWith('["#')) {
            try {
                const colors = JSON.parse(user.coverPhoto);
                setBannerType('gradient');
                setGradientColors(colors);
                setColor1(colors[0]);
                setColor2(colors[1]);
            } catch {}
        }
    }
    if (typeof user.profileBorder === 'object') {
        setProfileBorder('custom');
        if (user.profileBorder.gradient) {
            setCustomBorderColor1(user.profileBorder.gradient[0]);
            setCustomBorderColor2(user.profileBorder.gradient[1]);
        }
        if (user.profileBorder.glow) {
            setCustomBorderGlow(user.profileBorder.glow);
        }
    }
  }, [user.coverPhoto, user.profileBorder]);


  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUri = reader.result as string;
        setAvatarPreview(dataUri);
        
        if (file.type.startsWith('image/')) {
            setIsExtractingColors(true);
            try {
              const result = await extractColors({ imageDataUri: dataUri });
              if (result.colors && result.colors.length === 2) {
                setGradientColors(result.colors);
                setColor1(result.colors[0]);
                setColor2(result.colors[1]);
                setBannerType('gradient'); 
                setCoverPhotoData(JSON.stringify(result.colors));
              }
            } catch (error) {
                console.error("Failed to extract colors:", error);
            } finally {
                setIsExtractingColors(false);
            }
        }
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
    if (!authUser) return;
    
    setIsSubmitting(true);
    try {
        let borderData: User['profileBorder'] = profileBorder;
        if (profileBorder === 'custom') {
            borderData = {
                gradient: [customBorderColor1, customBorderColor2],
                glow: customBorderGlow
            }
        }

        await updateUserProfile(authUser.uid, {
            name,
            username,
            bio,
            avatar: avatarPreview,
            coverPhoto: coverPhotoData,
            profileSong: profileSong,
            profileBorder: borderData,
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
      <DialogContent className="sm:max-w-3xl p-0 h-full sm:h-auto">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="p-6 flex-shrink-0">
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="profile" className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-0 sm:gap-6 flex-grow overflow-hidden">
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
                      <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
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
                                <video src={avatarPreview} loop autoPlay muted className="w-full h-full object-cover" />
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
                          <AnimatedBanner videoUrl={bannerType === 'video' ? videoBanner : undefined} color={bannerType === 'gradient' ? gradientColors : undefined} />
                          {isExtractingColors && (
                              <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
                                  <Wand2 className='text-white w-6 h-6 animate-pulse' />
                              </div>
                          )}
                      </div>
                      <div className='space-y-4 pt-2'>
                          <RadioGroup value={bannerType} className="flex gap-4" onValueChange={setBannerType}>
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="gradient" id="r2" />
                              <Label htmlFor="r2">Gradient</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="video" id="r3" />
                              <Label htmlFor="r3">Video</Label>
                          </div>
                          </RadioGroup>
                          
                          {bannerType === 'gradient' && (
                              <div className='flex items-center gap-2'>
                                  <Input type="color" value={color1} onChange={(e) => handleColorChange(e.target.value, color2)} />
                                  <Input type="color" value={color2} onChange={(e) => handleColorChange(color1, e.target.value)} />
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
                      <Label htmlFor="profileBorder">Avatar Border</Label>
                      <Select value={typeof profileBorder === 'object' ? 'custom' : profileBorder} onValueChange={setProfileBorder}>
                          <SelectTrigger id="profileBorder">
                              <SelectValue placeholder="Select a border" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="rainbow">Rainbow</SelectItem>
                              <SelectItem value="gold">Gold</SelectItem>
                              <SelectItem value="neon">Neon</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  {profileBorder === 'custom' && (
                      <div className="space-y-4 border p-4 rounded-md">
                          <h4 className="font-medium text-sm">Custom Border</h4>
                          <div className='space-y-2'>
                              <Label>Gradient</Label>
                              <div className="flex items-center gap-2">
                                  <Input type="color" value={customBorderColor1} onChange={(e) => setCustomBorderColor1(e.target.value)} />
                                  <Input type="color" value={customBorderColor2} onChange={(e) => setCustomBorderColor2(e.target.value)} />
                              </div>
                          </div>
                          <div className='space-y-2'>
                              <Label>Glow</Label>
                              <div className="flex items-center gap-2">
                                  <Input type="color" value={customBorderGlow} onChange={(e) => setCustomBorderGlow(e.target.value)} />
                              </div>
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

          <DialogFooter className="border-t p-6 flex-shrink-0">
            <DialogClose asChild>
                <Button type="button" variant="secondary">
                    Cancel
                </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || isExtractingColors}>
              {isSubmitting ? 'Saving...' : isExtractingColors ? 'Analyzing...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
