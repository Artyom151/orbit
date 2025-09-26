'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Call } from '@/lib/types';
import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { acceptCall, declineCall } from '@/lib/call-service';
import { useDatabase } from '@/firebase';

type IncomingCallDialogProps = {
    incomingCall: Call | null;
    onAccept: () => void;
    onDecline: () => void;
};

export function IncomingCallDialog({ incomingCall, onAccept, onDecline }: IncomingCallDialogProps) {
    const db = useDatabase();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setIsOpen(!!incomingCall);
    }, [incomingCall]);
    
    const handleAccept = async () => {
        if (!incomingCall || !db) return;
        await acceptCall(db, incomingCall.id);
        onAccept();
        setIsOpen(false);
    }
    
    const handleDecline = async () => {
        if (!incomingCall || !db) return;
        await declineCall(db, incomingCall.id);
        onDecline();
        setIsOpen(false);
    }
    
    if (!incomingCall) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader className="items-center">
                    <DialogTitle>Incoming {incomingCall.type} call</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <Avatar className="w-24 h-24 text-4xl">
                        <AvatarImage src={incomingCall.caller.avatar} />
                        <AvatarFallback>{incomingCall.caller.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-center">
                        <p className="font-bold text-xl">{incomingCall.caller.name}</p>
                        <p className="text-muted-foreground">@{incomingCall.caller.username}</p>
                    </div>
                </div>
                <DialogFooter className='sm:justify-center gap-4'>
                    <Button variant="destructive" size="lg" className="rounded-full h-16 w-16" onClick={handleDecline}>
                        <PhoneOff />
                    </Button>
                    <Button variant="secondary" size="lg" className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600" onClick={handleAccept}>
                        {incomingCall.type === 'video' ? <Video /> : <Phone />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
