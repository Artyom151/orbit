
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

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                bannerUrl = 'default_gradient';
                break;
            case 'custom':
                // In a real app, upload bannerPreview to storage and get URL
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
                <RadioGroup defaultValue="placeholder" className="flex gap-4" onValueChange={setBannerType}>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="placeholder" id="r1" />
                      <Label htmlFor="r1">Placeholder</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="gradient" id="r2" />
                      <Label htmlFor="r2">Gradient</Label>
                  </div>
                   <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="r3" />
                      <Label htmlFor="r3">Custom</Label>
                  </div>
                </RadioGroup>
                {bannerType === 'custom' && (
                    <div>
                        <Input type="file" accept="image/*" className='hidden' ref={bannerInputRef} onChange={handleBannerChange} />
                        <Button type="button" variant="outline" onClick={() => bannerInputRef.current?.click()}>Upload Image</Button>
                        {bannerPreview && <Image src={bannerPreview} alt="Banner preview" width={400} height={100} className="rounded-md object-cover mt-2" />}
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
