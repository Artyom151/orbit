
'use client';
import { Call } from '@/lib/types';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useDatabase } from '@/firebase';
import { listenForCallEnd, endCall, listenForAnswer, listenForIceCandidates, createAnswerAndListenForCandidates, createOfferAndListenForCandidates } from '@/lib/webrtc-service';
import { useToast } from '@/hooks/use-toast';


type CallViewProps = {
    call: Call;
    onEndCall: () => void;
    isReceiving?: boolean;
};

export function CallView({ call, onEndCall, isReceiving = false }: CallViewProps) {
    const { user: authUser } = useUser();
    const db = useDatabase();
    const { toast } = useToast();

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(call.type === 'audio');
    
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    
    const otherUser = useMemo(() => {
        if (!authUser) return null;
        return call.caller.id === authUser.uid ? call.receiver : call.caller;
    }, [call, authUser]);

    // Cleanup function
    const cleanupCall = () => {
        console.log("Cleaning up call resources...");
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
    
    // Main call setup effect
    useEffect(() => {
        if (!db || !authUser || !otherUser) return;

        const initializeCall = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: call.type === 'video',
                    audio: true,
                });
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                if (isReceiving) {
                    // Answerer's logic
                    const pc = await createAnswerAndListenForCandidates(db, call, stream, (remoteStream) => {
                         if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = remoteStream;
                        }
                    });
                    peerConnectionRef.current = pc;
                } else {
                    // Caller's logic
                    const pc = await createOfferAndListenForCandidates(db, call, stream, (remoteStream) => {
                         if (remoteVideoRef.current) {
                            remoteVideoRef.current.srcObject = remoteStream;
                        }
                    });
                    peerConnectionRef.current = pc;
                }
            } catch (error) {
                console.error("Failed to start call:", error);
                toast({ variant: 'destructive', title: "Call Failed", description: "Could not access camera or microphone." });
                onEndCall();
            }
        };

        initializeCall();

        // Listen for the other user to end the call
        const unsubscribeCallEnd = listenForCallEnd(db, call.id, () => {
            onEndCall();
        });

        // Return a cleanup function
        return () => {
            unsubscribeCallEnd();
            cleanupCall();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, authUser, otherUser, call, isReceiving, onEndCall, toast]);
    
    const handleToggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(prev => !prev);
        }
    };
    
    const handleToggleCamera = () => {
        if (call.type === 'video' && localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsCameraOff(prev => !prev);
        }
    };

    const handleHangup = () => {
        if (db) {
            endCall(db, call.id);
        }
        onEndCall();
    }

    if (!otherUser) return null;


    return (
        <div className="absolute inset-0 bg-background z-50 flex flex-col items-center justify-between p-4 md:p-8 animate-fade-in">
             {/* Remote Video */}
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-black -z-10" />
            <div className="absolute inset-0 bg-black/30 -z-10" />

             {/* Header Info */}
            <div className="text-center pt-8 md:pt-16 text-white">
                <h1 className="text-3xl md:text-4xl font-bold mt-6 drop-shadow-lg">{otherUser.name}</h1>
                <p className="text-white/80 text-lg mt-2 drop-shadow-md">In call...</p>
            </div>

            {/* Local Video */}
            <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted
                className={cn(
                    "absolute top-4 right-4 w-32 h-48 sm:w-40 sm:h-56 rounded-lg object-cover border-2 border-white/50 shadow-lg",
                    isCameraOff || call.type === 'audio' ? 'hidden' : 'block'
                )}
            />
            
            {/* Controls */}
            <div className="flex items-center gap-4 mb-8">
                <Button 
                    variant="secondary" 
                    size="lg"
                    className={cn("rounded-full h-16 w-16 bg-white/10 text-white backdrop-blur-sm", isMuted && 'bg-red-500/80')}
                    onClick={handleToggleMute}
                >
                    {isMuted ? <MicOff /> : <Mic />}
                </Button>
                
                {call.type === 'video' && (
                    <Button 
                        variant="secondary" 
                        size="lg"
                        className={cn("rounded-full h-16 w-16 bg-white/10 text-white backdrop-blur-sm", isCameraOff && 'bg-primary/50')}
                        onClick={handleToggleCamera}
                    >
                        {isCameraOff ? <VideoOff /> : <Video />}
                    </Button>
                )}

                <Button 
                    size="lg"
                    variant="destructive" 
                    className="rounded-full h-16 w-16" 
                    onClick={handleHangup}
                >
                    <PhoneOff />
                </Button>
            </div>
        </div>
    );
}
