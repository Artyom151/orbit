
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
import { useDatabase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ref, update } from 'firebase/database';
import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import type { Group } from '@/lib/types';
import Image from 'next/image';

type EditGroupDialogProps = {
  group: Group;
  children: React.ReactNode;
};

export function EditGroupDialog({ group, children }: EditGroupDialogProps) {
  const db = useDatabase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  
  const getInitialBannerType = () => {
    if (!group.bannerUrl) return 'placeholder';
    if (group.bannerUrl.startsWith('["#')) return 'gradient';
    if (group.bannerUrl.startsWith('data:video')) return 'custom_video';
    if (group.bannerUrl.startsWith('data:image') || group.bannerUrl.startsWith('http')) return 'custom_image';
    return 'placeholder';
  }

  const [bannerType, setBannerType] = useState(getInitialBannerType());
  const [bannerPreview, setBannerPreview] = useState<string | null>(group.bannerUrl.startsWith('data:') ? group.bannerUrl : null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const bannerVideoInputRef = React.useRef<HTMLInputElement>(null);
  const [color1, setColor1] = useState('#a855f7');
  const [color2, setColor2] = useState('#6366f1');

  React.useEffect(() => {
    if (bannerType === 'gradient' && group.bannerUrl.startsWith('["#')) {
        try {
            const colors = JSON.parse(group.bannerUrl);
            setColor1(colors[0]);
            setColor2(colors[1]);
        } catch {}
    }
  }, [bannerType, group.bannerUrl]);


  const handleBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleBannerVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !db) return;
    
    setIsSubmitting(true);
    try {
        const groupRef = ref(db, `groups/${group.id}`);

        let bannerUrl = group.bannerUrl; // Default to old one
        switch(bannerType) {
            case 'gradient':
                bannerUrl = JSON.stringify([color1, color2]);
                break;
            case 'custom_image':
            case 'custom_video':
                 if (bannerPreview) {
                    bannerUrl = bannerPreview;
                 }
                 break;
            case 'placeholder':
            default:
                 bannerUrl = `https://picsum.photos/seed/${group.id}/800/200`;
                 break;
        }

        const updates: Partial<Group> = {
            name,
            description,
            bannerUrl,
        };

        await update(groupRef, updates);

        toast({
            title: 'Group Updated',
            description: `"${name}" has been successfully updated.`,
        });
        
        setIsOpen(false);
    } catch (error) {
         toast({
            variant: "destructive",
            title: 'Update Failed',
            description: 'Could not update the group. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Group Name
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Banner
              </Label>
              <div className='col-span-3 space-y-4'>
                <RadioGroup value={bannerType} className="flex flex-wrap gap-4" onValueChange={(value) => { setBannerType(value); setBannerPreview(null); }}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="placeholder" id="r1" />
                        <Label htmlFor="r1">Placeholder</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gradient" id="r2" />
                        <Label htmlFor="r2">Gradient</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom_image" id="r3" />
                        <Label htmlFor="r3">Image</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom_video" id="r4" />
                        <Label htmlFor="r4">Video</Label>
                    </div>
                </RadioGroup>

                {bannerType === 'gradient' && (
                    <div className='flex items-center gap-2'>
                        <Input type="color" value={color1} onChange={(e) => setColor1(e.target.value)} />
                        <Input type="color" value={color2} onChange={(e) => setColor2(e.target.value)} />
                    </div>
                )}
                {bannerType === 'custom_image' && (
                    <div>
                        <Input type="file" accept="image/*" className='hidden' ref={bannerInputRef} onChange={handleBannerImageChange} />
                        <Button type="button" variant="outline" onClick={() => bannerInputRef.current?.click()}>Upload Image</Button>
                        {bannerPreview ? <Image src={bannerPreview} alt="Banner preview" width={400} height={100} className="rounded-md object-cover mt-2" /> : (group.bannerUrl && group.bannerUrl.startsWith('http')) && <Image src={group.bannerUrl} alt="Banner preview" width={400} height={100} className="rounded-md object-cover mt-2" />}
                    </div>
                )}
                 {bannerType === 'custom_video' && (
                    <div>
                        <Input type="file" accept="video/*" className='hidden' ref={bannerVideoInputRef} onChange={handleBannerVideoChange} />
                        <Button type="button" variant="outline" onClick={() => bannerVideoInputRef.current?.click()}>Upload Video</Button>
                        {bannerPreview ? <video src={bannerPreview} muted loop autoPlay className="rounded-md object-cover mt-2 w-full h-auto max-h-28" /> : (group.bannerUrl.startsWith('data:video') && <video src={group.bannerUrl} muted loop autoPlay className="rounded-md object-cover mt-2 w-full h-auto max-h-28" />)}
                    </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">
                    Cancel
                </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
