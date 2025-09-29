
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDatabase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ref, serverTimestamp, update } from 'firebase/database';
import React, { useState, useEffect } from 'react';
import type { Status } from '@/lib/types';
import { useObject } from '@/firebase/rtdb/use-object';

type SetStatusDialogProps = {
  children: React.ReactNode;
};

export function SetStatusDialog({ children }: SetStatusDialogProps) {
  const { user: authUser } = useUser();
  const db = useDatabase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('');
  
  const statusRef = React.useMemo(() => {
    if (!authUser || !db) return null;
    return ref(db, `status/${authUser.uid}`);
  }, [authUser, db]);
  
  const { data: currentStatus } = useObject<Status>(statusRef);

  useEffect(() => {
    if (currentStatus) {
      setStatusText(currentStatus.customStatus || '');
    }
  }, [currentStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !db) return;
    
    setIsSubmitting(true);
    try {
        const updates = {
            customStatus: statusText,
            last_changed: serverTimestamp(),
        };

        await update(statusRef!, updates);

        toast({
            title: 'Status Updated',
        });
        
        setIsOpen(false);
    } catch (error) {
         toast({
            variant: "destructive",
            title: 'Update Failed',
            description: 'Could not update your status.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Set a status</DialogTitle>
            <DialogDescription>
                Your status is visible to everyone on your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Input 
                id="status" 
                value={statusText} 
                onChange={(e) => setStatusText(e.target.value)} 
                className="col-span-3"
                placeholder="What's happening?" 
                maxLength={60}
                />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">
                    Cancel
                </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Set Status'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
