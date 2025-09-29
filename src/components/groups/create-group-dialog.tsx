
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
import { useDatabase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ref, serverTimestamp, set, push } from 'firebase/database';
import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import Image from 'next/image';

type CreateGroupDialogProps = {
  children: React.ReactNode;
};

export function CreateGroupDialog({ children }: CreateGroupDialogProps) {
  const { user: authUser } = useUser();
  const db = useDatabase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bannerType, setBannerType] = useState('placeholder');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const bannerVideoInputRef = React.useRef<HTMLInputElement>(null);
  const [color1, setColor1] = useState('#a855f7');
  const [color2, setColor2] = useState('#6366f1');


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
    if (!authUser || !name.trim() || !db) return;
    
    setIsSubmitting(true);
    try {
        const groupsRef = ref(db, 'groups');
        const newGroupRef = push(groupsRef);

        let bannerUrl = '';
        switch(bannerType) {
            case 'gradient':
                bannerUrl = JSON.stringify([color1, color2]);
                break;
            case 'custom_image':
            case 'custom_video':
                bannerUrl = bannerPreview || `https://picsum.photos/seed/${newGroupRef.key}/800/200`;
                break;
            case 'placeholder':
            default:
                 bannerUrl = `https://picsum.photos/seed/${newGroupRef.key}/800/200`;
                 break;
        }

        await set(newGroupRef, {
            name,
            description,
            createdBy: authUser.uid,
            createdAt: serverTimestamp(),
            memberCount: 1, // Creator is the first member
            bannerUrl: bannerUrl,
        });

        // Add creator to members list
        const groupMembersRef = ref(db, `groupMembers/${newGroupRef.key}/${authUser.uid}`);
        await set(groupMembersRef, {
            userId: authUser.uid,
            groupId: newGroupRef.key,
            joinedAt: serverTimestamp(),
        });

        toast({
            title: 'Group Created',
            description: `"${name}" has been successfully created.`,
        });
        
        setName('');
        setDescription('');
        setBannerType('placeholder');
        setBannerPreview(null);
        setIsOpen(false);
    } catch (error) {
         toast({
            variant: "destructive",
            title: 'Creation Failed',
            description: 'Could not create your group. Please try again.',
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
            <DialogTitle>Create a new group</DialogTitle>
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
                <RadioGroup defaultValue="placeholder" className="flex flex-wrap gap-4" onValueChange={(value) => { setBannerType(value); setBannerPreview(null); }}>
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
                        {bannerPreview && <Image src={bannerPreview} alt="Banner preview" width={400} height={100} className="rounded-md object-cover mt-2" />}
                    </div>
                )}
                {bannerType === 'custom_video' && (
                    <div>
                        <Input type="file" accept="video/*" className='hidden' ref={bannerVideoInputRef} onChange={handleBannerVideoChange} />
                        <Button type="button" variant="outline" onClick={() => bannerVideoInputRef.current?.click()}>Upload Video</Button>
                        {bannerPreview && <video src={bannerPreview} muted loop autoPlay className="rounded-md object-cover mt-2 w-full h-auto max-h-28" />}
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
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
