'use client';
import { User, Call } from '@/lib/types';
import React, { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

type CallViewProps = {
    call: Call;
    onEndCall: () => void;
};

export function CallView({ call, onEndCall }: CallViewProps) {
    const { user: authUser } = useUser();
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(call.type === 'audio');

    const otherUser = useMemo(() => {
        if (!authUser) return null;
        return call.caller.id === authUser.uid ? call.receiver : call.caller;
    }, [call, authUser]);

    const callStatusText = useMemo(() => {
        if (call.status === 'ringing') return 'Ringing...';
        if (call.status === 'active') return 'Connected';
        return 'Calling...';
    }, [call.status]);

    if (!otherUser) return null;


    return (
        <div className="absolute inset-0 bg-background z-50 flex flex-col items-center justify-between p-8 animate-fade-in">
            <div className="text-center pt-16">
                <Avatar className="w-32 h-32 text-5xl mx-auto border-4 border-primary/50">
                    <AvatarImage src={otherUser.avatar} />
                    <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h1 className="text-4xl font-bold mt-6">{otherUser.name}</h1>
                <p className="text-muted-foreground text-lg mt-2">{callStatusText}</p>
            </div>
            
            {call.type === 'video' && !isCameraOff && (
                 <div className="absolute inset-0 bg-black/80 -z-10 flex items-center justify-center">
                    <p className="text-white">Video feed would be here</p>
                </div>
            )}

            <div className="flex items-center gap-4">
                <Button 
                    variant="secondary" 
                    size="lg"
                    className={cn("rounded-full h-16 w-16", isMuted && 'bg-primary/20')}
                    onClick={() => setIsMuted(!isMuted)}
                >
                    {isMuted ? <MicOff /> : <Mic />}
                </Button>
                
                {call.type === 'video' && (
                    <Button 
                        variant="secondary" 
                        size="lg"
                        className={cn("rounded-full h-16 w-16", isCameraOff && 'bg-primary/20')}
                        onClick={() => setIsCameraOff(!isCameraOff)}
                    >
                        {isCameraOff ? <VideoOff /> : <Video />}
                    </Button>
                )}

                <Button 
                    size="lg"
                    variant="destructive" 
                    className="rounded-full h-16 w-16" 
                    onClick={onEndCall}
                >
                    <PhoneOff />
                </Button>
            </div>
        </div>
    );
}

    