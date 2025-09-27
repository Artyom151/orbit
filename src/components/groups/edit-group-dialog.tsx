
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
    if (group.bannerUrl === 'default_gradient') return 'gradient';
    if (group.bannerUrl.startsWith('data:image')) return 'custom';
    return 'placeholder';
  }

  const [bannerType, setBannerType] = useState(getInitialBannerType());
  const [bannerPreview, setBannerPreview] = useState(group.bannerUrl.startsWith('data:image') ? group.bannerUrl : null);
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
    if (!name.trim() || !db) return;
    
    setIsSubmitting(true);
    try {
        const groupRef = ref(db, `groups/${group.id}`);

        let bannerUrl = '';
        switch(bannerType) {
            case 'gradient':
                bannerUrl = 'default_gradient';
                break;
            case 'custom':
                 // In a real app, upload bannerPreview to storage and get URL
                bannerUrl = bannerPreview || `https://picsum.photos/seed/${group.id}/800/200`;
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
                <RadioGroup defaultValue={bannerType} className="flex gap-4" onValueChange={setBannerType}>
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
