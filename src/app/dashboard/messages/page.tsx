
'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDatabase, useUser, useObject } from "@/firebase";
import { Search, Phone, Video, MoreVertical, Send, ArrowLeft } from "lucide-react";
import { ref, query, orderByChild, onValue, push, set, serverTimestamp, get, startAt, endAt, equalTo } from "firebase/database";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useList } from "@/firebase/rtdb/use-list";
import type { User as UserType, Call as CallType } from "@/lib/types";
import { NewMessageDialog } from "@/components/messages/new-message-dialog";
import { CallView } from "@/components/messages/call-view";
import { createCall, listenForIncomingCall, endCall } from "@/lib/call-service";
import { IncomingCallDialog } from "@/components/messages/incoming-call-dialog";


type UserDoc = UserType;

type ConversationDoc = {
    id: string;
    users: Record<string, boolean>;
    lastMessage?: MessageDoc;
    otherUser?: UserType;
}

type MessageDoc = {
    id: string;
    senderId: string;
    text: string;
    timestamp: any;
}


export default function MessagesPage() {
    const { user: authUser } = useUser();
    const db = useDatabase();
    const [selectedConversation, setSelectedConversation] = useState<ConversationDoc | null>(null);
    const [newMessage, setNewMessage] = useState("");
    
    // Call state
    const [activeCall, setActiveCall] = useState<CallType | null>(null);
    const [incomingCall, setIncomingCall] = useState<CallType | null>(null);

    const activeCallRef = useMemo(() => {
        if (!db || !activeCall) return null;
        return ref(db, `calls/${activeCall.id}`);
    }, [db, activeCall]);
    
    const { data: activeCallData } = useObject<CallType>(activeCallRef);
    
    useEffect(() => {
        if (activeCallData && (activeCallData.status === 'ended' || activeCallData.status === 'declined')) {
            setActiveCall(null);
        }
    }, [activeCallData]);

    useEffect(() => {
        if (!authUser || !db) return;

        const unsubscribe = listenForIncomingCall(db, authUser.uid, (call) => {
            if (call.status === 'ringing') {
                setIncomingCall(call);
            } else {
                setIncomingCall(null);
            }
        });

        return () => unsubscribe();
    }, [authUser, db]);

    const handleStartCall = async (type: 'audio' | 'video') => {
        if (!authUser || !db || !selectedConversation?.otherUser) return;
        const call = await createCall(db, authUser, selectedConversation.otherUser, type);
        setActiveCall(call);
    }
    
    const handleEndCall = async () => {
        if (!db || !activeCall) return;
        await endCall(db, activeCall.id);
        setActiveCall(null);
    }


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

    const { data: messages, loading: loadingMessages } = useList<MessageDoc>(messagesQuery);

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
        if (!newMessage.trim() || !selectedConversation || !authUser || !db) return;
        
        const messagesRef = ref(db, `messages/${selectedConversation.id}`);
        const newMessageRef = push(messagesRef);
        await set(newMessageRef, {
            senderId: authUser.uid,
            text: newMessage,
            timestamp: serverTimestamp(),
        });
        setNewMessage("");
    }
    
    const otherUser = selectedConversation?.otherUser;

    if (activeCall) {
        return <CallView call={activeCall} onEndCall={handleEndCall} />
    }


  return (
    <>
    <IncomingCallDialog incomingCall={incomingCall} onAccept={() => {
        if(incomingCall) {
            setActiveCall(incomingCall);
            setIncomingCall(null);
        }
    }} onDecline={() => setIncomingCall(null)}/>
    <div className="grid lg:grid-cols-[350px_1fr] h-[calc(100vh-65px)] lg:h-screen">
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
                {!loadingConversations && conversationsWithData.map((conv) => (
                    <button key={conv.id} onClick={() => handleSelectConversation(conv)} className="w-full text-left">
                        <div className={cn(
                            "flex items-start gap-3 p-4 border-b border-border hover:bg-secondary",
                            selectedConversation?.id === conv.id && "bg-secondary"
                        )}>
                            <Avatar className="h-12 w-12 border-none">
                                <AvatarImage src={conv.otherUser?.avatar} />
                                <AvatarFallback>{conv.otherUser?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <p className="font-bold">{conv.otherUser?.name}</p>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                </p>
                            </div>
                        </div>
                    </button>
                ))}
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
                                <AvatarImage src={otherUser.avatar} />
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
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        {loadingMessages && <p className="text-center text-muted-foreground">Loading messages...</p>}
                        {!loadingMessages && messages.map((msg: MessageDoc) => (
                            <div key={msg.id} className={`flex ${msg.senderId === authUser?.uid ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-3 rounded-lg max-w-md ${msg.senderId === authUser?.uid ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-border flex items-center gap-2">
                        <Input 
                            placeholder="Start a new message" 
                            className="rounded-full bg-secondary border-none"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <Button size="icon" className="rounded-full" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                            <Send/>
                        </Button>
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
