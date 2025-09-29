

'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDatabase, useUser } from "@/firebase";
import { Search, Phone, Video, MoreVertical, Send, ArrowLeft, Mic, StopCircle, Trash2, Play, Edit, Check, X } from "lucide-react";
import { ref, query, orderByChild, onValue, push, set, serverTimestamp, get, startAt, endAt, equalTo, remove, update } from "firebase/database";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useList } from "@/firebase/rtdb/use-list";
import type { User as UserType, Call as CallType, Message as MessageType } from "@/lib/types";
import { NewMessageDialog } from "@/components/messages/new-message-dialog";
import { CallView } from "@/components/messages/call-view";
import { createCall, listenForIncomingCall, endCall, acceptCall, declineCall } from "@/lib/call-service";
import { IncomingCallDialog } from "@/components/messages/incoming-call-dialog";
import { useMusicPlayer } from "@/context/music-player-context";
import { Slider } from "@/components/ui/slider";
import { formatDistanceToNow } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useObject } from "@/firebase/rtdb/use-object";


type UserDoc = UserType;

type ConversationDoc = {
    id: string;
    users: Record<string, boolean>;
    lastMessage?: MessageType;
    otherUser?: UserType;
}

const AudioPlayer = ({ src }: { src: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };
        const onLoadedMetadata = () => setDuration(audio.duration);
        const onEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || seconds === Infinity) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    return (
        <div className="flex items-center gap-2 w-64">
            <audio ref={audioRef} src={src} preload="metadata" />
            <Button size="icon" variant="ghost" className="rounded-full" onClick={togglePlay}>
                {isPlaying ? <StopCircle className="size-5" /> : <Play className="size-5" />}
            </Button>
            <Slider
                value={[progress]}
                max={100}
                step={1}
                className="w-full"
                onValueChange={(value) => {
                    if (audioRef.current) {
                        audioRef.current.currentTime = (value[0] / 100) * duration;
                    }
                }}
            />
            <span className="text-xs text-muted-foreground font-mono">{formatTime(duration)}</span>
        </div>
    );
};


export default function MessagesPage() {
    const { user: authUser } = useUser();
    const db = useDatabase();
    const { toast } = useToast();
    const [selectedConversation, setSelectedConversation] = useState<ConversationDoc | null>(null);
    const [newMessage, setNewMessage] = useState("");
    
    // Call state
    const [activeCall, setActiveCall] = useState<CallType | null>(null);
    const [incomingCall, setIncomingCall] = useState<CallType | null>(null);
    const [isReceivingCall, setIsReceivingCall] = useState(false);

    // Music Player context for layout adjustment
    const { currentTrack } = useMusicPlayer();

    // Voice message state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    
    // Edit message state
    const [editingMessage, setEditingMessage] = useState<MessageType | null>(null);
    const [editingContent, setEditingContent] = useState('');
    
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.start();

            const audioChunks: Blob[] = [];
            mediaRecorderRef.current.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorderRef.current.addEventListener("stop", () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                setAudioUrl(URL.createObjectURL(audioBlob));
                stream.getTracks().forEach(track => track.stop()); // Stop microphone access
            });

            setIsRecording(true);
            setAudioBlob(null);
            setAudioUrl(null);
        } catch (error) {
            toast({ variant: 'destructive', title: "Mic Error", description: "Could not access microphone."});
            console.error("Error accessing microphone:", error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const cancelRecording = () => {
        stopRecording();
        setAudioBlob(null);
        setAudioUrl(null);
    };

    useEffect(() => {
        if (!authUser || !db) return;

        const unsubscribe = listenForIncomingCall(db, authUser.uid, (call) => {
             if (call.status === 'ringing' && !activeCall) {
                setIncomingCall(call);
            } else {
                setIncomingCall(null);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [authUser, db, activeCall]);

    const handleStartCall = async (type: 'audio' | 'video') => {
        if (!authUser || !db || !selectedConversation?.otherUser) return;
        const call = await createCall(db, authUser, selectedConversation.otherUser, type);
        setActiveCall(call);
        setIsReceivingCall(false);
    }
    
    const activeCallRef = useMemo(() => {
        if (!db || !activeCall) return null;
        return ref(db, `calls/${activeCall.id}`);
    }, [db, activeCall]);
    
    const { data: activeCallData } = useObject<CallType>(activeCallRef);
    
    useEffect(() => {
        if (activeCallData && (activeCallData.status === 'ended' || activeCallData.status === 'declined')) {
            handleEndCall();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCallData]);


    const handleEndCall = () => {
        if (db && activeCall) {
            endCall(db, activeCall.id);
        }
        setActiveCall(null);
    }
    
     const handleAcceptCall = async () => {
        if (!incomingCall || !db) return;
        await acceptCall(db, incomingCall.id);
        setActiveCall(incomingCall);
        setIsReceivingCall(true);
        setIncomingCall(null);
    };
    
    const handleDeclineCall = () => {
        if (incomingCall && db) {
            declineCall(db, incomingCall.id);
        }
        setIncomingCall(null);
    };


    // Get all conversations the current user is a part of
    const conversationsQuery = useMemo(() => {
        if (!authUser || !db) return null;
        return query(ref(db, 'conversations'), orderByChild(`users/${authUser.uid}`), equalTo(true));
    }, [authUser, db]);

    const { data: conversations, loading: loadingConversations } = useList<Omit<ConversationDoc, 'otherUser'>>(conversationsQuery);
    
    const [conversationsWithData, setConversationsWithData] = useState<ConversationDoc[]>([]);

    useEffect(() => {
        if (!conversations.length || !db || !authUser) {
            setConversationsWithData([]);
            return;
        };

        const fetchConversationDetails = async () => {
            const convosWithDetails = await Promise.all(
                conversations.map(async (convo) => {
                    const otherUserId = Object.keys(convo.users).find(uid => uid !== authUser?.uid);
                    let otherUser: UserDoc | undefined = undefined;
                    
                    if (otherUserId) {
                        const userSnap = await get(ref(db, `users/${otherUserId}`));
                        if (userSnap.exists()) {
                            otherUser = { id: userSnap.key, ...userSnap.val() } as UserDoc;
                        }
                    }
                    return { ...convo, otherUser };
                })
            );
            setConversationsWithData(convosWithDetails);
        };
        
        fetchConversationDetails();
    }, [conversations, db, authUser]);

    const messagesQuery = useMemo(() => {
        if (!selectedConversation || !db) return null;
        return query(ref(db, `messages/${selectedConversation.id}`), orderByChild("timestamp"));
    }, [db, selectedConversation]);

    const { data: messages, loading: loadingMessages } = useList<MessageType>(messagesQuery);

    const handleSelectConversation = useCallback((conv: ConversationDoc) => {
        setSelectedConversation(conv);
    }, []);

    const handleCreateConversation = async (user: UserDoc) => {
        if (!authUser || !db) return;

        const existingConvo = conversationsWithData.find(c => c.otherUser?.id === user.id);
        if (existingConvo) {
            setSelectedConversation(existingConvo);
            return;
        }

        const newConversationRef = push(ref(db, 'conversations'));
        const newConversation: Omit<ConversationDoc, 'id' | 'otherUser'> = {
            users: {
                [authUser.uid]: true,
                [user.id]: true
            }
        };
        await set(newConversationRef, newConversation);
        
        const newConvoForState: ConversationDoc = {
            id: newConversationRef.key!,
            ...newConversation,
            otherUser: user,
        }
        setConversationsWithData(prev => [newConvoForState, ...prev]);
        setSelectedConversation(newConvoForState);
    }
    
    const handleSendMessage = async () => {
        if (!selectedConversation || !authUser || !db) return;
        
        const messagesRef = ref(db, `messages/${selectedConversation.id}`);
        const newMessageRef = push(messagesRef);

        let messageData: Partial<MessageType> = {
            senderId: authUser.uid,
            timestamp: serverTimestamp(),
        };

        if (audioBlob && audioUrl) {
            // In a real app, upload blob to Firebase Storage and save URL.
            // For this demo, we'll simulate it by converting blob to a data URL.
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = reader.result as string;
                messageData.audioUrl = base64Audio;
                messageData.text = '';
                await set(newMessageRef, messageData);
                setAudioBlob(null);
                setAudioUrl(null);
            };
        } else if (newMessage.trim()) {
            messageData.text = newMessage.trim();
            await set(newMessageRef, messageData);
            setNewMessage("");
        }
    }
    
     const handleDeleteMessage = async (messageId: string) => {
        if (!selectedConversation || !db) return;
        const messageRef = ref(db, `messages/${selectedConversation.id}/${messageId}`);
        await remove(messageRef);
        toast({ title: 'Message deleted' });
    };
    
    const handleDeleteConversation = async (conversationId: string) => {
        if (!db) return;

        const conversationRef = ref(db, `conversations/${conversationId}`);
        const messagesRef = ref(db, `messages/${conversationId}`);

        try {
            await remove(conversationRef);
            await remove(messagesRef);
            
            toast({ title: "Conversation deleted" });
            
            if (selectedConversation?.id === conversationId) {
                setSelectedConversation(null);
            }
        } catch (error) {
            console.error("Error deleting conversation:", error);
            toast({ variant: 'destructive', title: "Could not delete conversation" });
        }
    };

    const handleStartEditing = (message: MessageType) => {
        setEditingMessage(message);
        setEditingContent(message.text);
    };

    const handleCancelEditing = () => {
        setEditingMessage(null);
        setEditingContent('');
    };

    const handleSaveEdit = async () => {
        if (!editingMessage || !selectedConversation || !db) return;
        const messageRef = ref(db, `messages/${selectedConversation.id}/${editingMessage.id}`);
        await update(messageRef, { text: editingContent, isEdited: true });
        handleCancelEditing();
        toast({ title: 'Message updated' });
    };

    const otherUser = selectedConversation?.otherUser;
    const isOtherUserVideoAvatar = otherUser?.avatar && otherUser.avatar.startsWith('data:video');

    if (activeCall) {
        return <CallView call={activeCall} onEndCall={handleEndCall} isReceiving={isReceivingCall} />
    }


  return (
    <>
    <IncomingCallDialog 
        incomingCall={incomingCall} 
        onAccept={handleAcceptCall} 
        onDecline={handleDeclineCall}
    />
    <div className={cn(
        "grid lg:grid-cols-[350px_1fr] h-[calc(100vh-65px)] lg:h-screen",
        currentTrack && "pb-[76px] lg:pb-0" // Adjust padding for music player
    )}>
        <div className={cn(
            "border-r border-border flex-col h-full",
            selectedConversation ? "hidden lg:flex" : "flex"
        )}>
            <div className="p-4 border-b border-border flex items-center justify-between sticky top-16 lg:top-0 bg-background/80 backdrop-blur-sm z-10">
                <h1 className="text-xl font-bold lg:hidden">Messages</h1>
                <div className="hidden lg:block">
                    <h1 className="text-xl font-bold">Messages</h1>
                </div>
                <NewMessageDialog onSelectUser={handleCreateConversation} />
            </div>
             <div className="p-4 border-b border-border">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search messages" className="rounded-full pl-10 bg-secondary border-none h-10" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {loadingConversations && <p className="p-4 text-center text-muted-foreground">Loading conversations...</p>}
                {!loadingConversations && conversationsWithData.map((conv) => {
                  const isVideoAvatar = conv.otherUser?.avatar && conv.otherUser.avatar.startsWith('data:video');
                  return (
                    <div
                        key={conv.id} 
                        className={cn(
                            "flex items-start gap-3 p-4 border-b border-border hover:bg-secondary group relative",
                            selectedConversation?.id === conv.id && "bg-secondary"
                        )}
                        onClick={() => handleSelectConversation(conv)}
                    >
                        <Avatar className="h-12 w-12 border-none">
                            {isVideoAvatar ? (
                                <video src={conv.otherUser!.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <AvatarImage src={conv.otherUser?.avatar} />
                            )}
                            <AvatarFallback>{conv.otherUser?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                                <p className="font-bold">{conv.otherUser?.name}</p>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                            </p>
                        </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                            <Trash2 className="mr-2 size-4"/> Delete Conversation
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete all messages in this conversation. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteConversation(conv.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )})}
                 {!loadingConversations && conversationsWithData.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No conversations yet.</p>
                 )}
            </div>
        </div>
        <div className={cn(
            "flex-col h-full",
            selectedConversation ? "flex" : "hidden lg:flex"
        )}>
            {selectedConversation && otherUser ? (
                <>
                    <div className="sticky top-16 lg:top-0 z-10 bg-background/80 backdrop-blur-sm p-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedConversation(null)}>
                                <ArrowLeft />
                            </Button>
                            <Avatar className="h-10 w-10 border-none">
                                {isOtherUserVideoAvatar ? (
                                    <video src={otherUser.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <AvatarImage src={otherUser.avatar} />
                                )}
                                <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold">{otherUser.name}</p>
                                <p className="text-sm text-muted-foreground">@{otherUser.username}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-0 sm:gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleStartCall('audio')}><Phone /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleStartCall('video')}><Video /></Button>
                            <Button variant="ghost" size="icon"><MoreVertical /></Button>
                        </div>
                    </div>
                    <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {loadingMessages && <p className="text-center text-muted-foreground">Loading messages...</p>}
                        {!loadingMessages && messages.map((msg: MessageType) => (
                            <div key={msg.id} className={cn('flex group items-end gap-2', msg.senderId === authUser?.uid ? 'justify-end' : 'justify-start')}>
                                {msg.senderId === authUser?.uid && (
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {!msg.audioUrl && (
                                                <DropdownMenuItem onSelect={() => handleStartEditing(msg)}>
                                                    <Edit className="mr-2 size-4"/> Edit
                                                </DropdownMenuItem>
                                            )}
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                        <Trash2 className="mr-2 size-4"/> Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete message?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                                <div className={`p-3 rounded-lg max-w-md ${msg.senderId === authUser?.uid ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                    {editingMessage?.id === msg.id ? (
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                value={editingContent}
                                                onChange={(e) => setEditingContent(e.target.value)}
                                                className="bg-primary-foreground text-black h-8"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit();
                                                    if (e.key === 'Escape') handleCancelEditing();
                                                }}
                                            />
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit}><Check/></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEditing}><X/></Button>
                                        </div>
                                    ) : (
                                        <>
                                            {msg.audioUrl ? (
                                                <AudioPlayer src={msg.audioUrl} />
                                            ) : (
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                            )}
                                            {msg.isEdited && <span className="text-xs text-muted-foreground/70 float-right pt-1 pl-2"> (edited)</span>}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-border flex items-center gap-2">
                        {audioUrl ? (
                            <div className="flex items-center gap-2 w-full">
                                <Button variant="ghost" size="icon" onClick={cancelRecording}><Trash2 /></Button>
                                <AudioPlayer src={audioUrl} />
                                <Button size="icon" className="rounded-full" onClick={handleSendMessage}>
                                    <Send/>
                                </Button>
                            </div>
                        ) : isRecording ? (
                             <div className="flex items-center gap-2 w-full">
                                <Button variant="destructive" size="icon" className="rounded-full" onClick={stopRecording}><StopCircle/></Button>
                                <div className="flex-1 bg-secondary h-10 rounded-full flex items-center px-4">
                                    <p className="text-muted-foreground animate-pulse">Recording...</p>
                                </div>
                             </div>
                        ) : (
                           <>
                                <Input 
                                    placeholder="Start a new message" 
                                    className="rounded-full bg-secondary border-none"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                {newMessage.trim() ? (
                                    <Button size="icon" className="rounded-full" onClick={handleSendMessage}>
                                        <Send/>
                                    </Button>
                                ) : (
                                    <Button size="icon" variant="ghost" className="rounded-full" onClick={startRecording}>
                                        <Mic />
                                    </Button>
                                )}
                           </>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-col items-center justify-center h-full text-center hidden lg:flex">
                    <div className="p-8 rounded-lg bg-secondary/50">
                        <h2 className="text-2xl font-bold">Select a message</h2>
                        <p className="text-muted-foreground mt-2">Choose from your existing conversations, start a new one, and just keep swimming.</p>
                        <NewMessageDialog onSelectUser={handleCreateConversation}>
                            <Button className="mt-6">New Message</Button>
                        </NewMessageDialog>
                    </div>
                </div>
            )}
        </div>
    </div>
    </>
  );
}
