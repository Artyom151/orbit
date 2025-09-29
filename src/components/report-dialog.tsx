
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDatabase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ref, serverTimestamp, set, push } from 'firebase/database';
import React, { useState } from 'react';
import type { Post } from '@/lib/types';
import { Textarea } from './ui/textarea';

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
};

export function ReportDialog({ open, onOpenChange, post }: ReportDialogProps) {
  const { user: authUser } = useUser();
  const db = useDatabase();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !reason.trim() || !db) return;
    
    setIsSubmitting(true);
    try {
        const reportsRef = ref(db, 'reports');
        const newReportRef = push(reportsRef);
        
        await set(newReportRef, {
            postId: post.id,
            reportedBy: authUser.uid,
            reason: reason,
            createdAt: serverTimestamp(),
        });

        toast({
            title: 'Report Submitted',
            description: "Thank you for helping keep Orbit safe.",
        });
        
        setReason('');
        onOpenChange(false);
    } catch (error) {
         toast({
            variant: "destructive",
            title: 'Submission Failed',
            description: 'Could not submit your report. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
            <DialogDescription>
                Why are you reporting this post? Your report is anonymous.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea 
                id="reason" 
                placeholder="Please provide a reason for your report..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="col-span-3"
             />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting || !reason.trim()}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
