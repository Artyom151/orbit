'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDatabase, useUser } from "@/firebase";
import { Search, Phone, Video, MoreVertical, Send, ArrowLeft } from "lucide-react";
import { ref, query, orderByChild, equalTo, onValue, push, set, serverTimestamp, get } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useList } from "@/firebase/rtdb/use-list";


type UserDoc = {
    id: string;
    name: string;
    email: string;
    avatar: string;
    username: string;
};

type ConversationDoc = {
    id: string;
    users: Record<string, boolean>;
    userData?: UserDoc[];
    lastMessage?: MessageDoc;
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
    
    const conversationsQuery = useMemo(() => {
        if (!authUser || !db) return null;
        return ref(db, 'conversations');
    }, [authUser, db]);

    const { data: allConversations, loading: loadingConversations } = useList<Omit<ConversationDoc, 'userData'>>(conversationsQuery);
    
    const [conversationsWithData, setConversationsWithData] = useState<ConversationDoc[]>([]);

    useEffect(() => {
        if (!allConversations.length || !db || !authUser) {
            setConversationsWithData([]);
            return;
        };

        const userConversations = allConversations.filter(c => c.users && c.users[authUser.uid]);

        const fetchUsers = async () => {
            const convosWithUsers = await Promise.all(
                userConversations.map(async (convo) => {
                    const otherUserId = Object.keys(convo.users).find(uid => uid !== authUser?.uid);
                    let userData: UserDoc[] = [];
                    if (otherUserId) {
                        const userSnap = await get(ref(db, `users/${otherUserId}`));
                        if (userSnap.exists()) {
                            userData.push({ id: userSnap.key, ...userSnap.val() } as UserDoc);
                        }
                    }
                     return { ...convo, userData };
                })
            );
            setConversationsWithData(convosWithUsers);
        };
        
        fetchUsers();
    }, [allConversations, db, authUser]);

    const messagesQuery = useMemo(() => {
        if (!selectedConversation || !db) return null;
        return query(ref(db, `messages/${selectedConversation.id}`), orderByChild("timestamp"));
    }, [db, selectedConversation]);

    const { data: messages, loading: loadingMessages } = useList<MessageDoc>(messagesQuery);

    const handleSelectConversation = (conv: ConversationDoc) => {
        setSelectedConversation(conv);
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
    
    const otherUser = selectedConversation?.userData?.[0];


  return (
    <div className="grid md:grid-cols-[350px_1fr] h-screen max-h-[calc(100vh-65px)] lg:max-h-screen">
        <div className={cn(
            "border-r border-border flex-col",
            selectedConversation ? "hidden md:flex" : "flex"
        )}>
            <div className="p-4 border-b border-border">
                <h1 className="text-xl font-bold">Messages</h1>
                 <div className="relative mt-4">
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
                                <AvatarImage src={conv.userData?.[0]?.avatar} />
                                <AvatarFallback>{conv.userData?.[0]?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <p className="font-bold">{conv.userData?.[0]?.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {/* Timestamp logic can be added here */}
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                    {/* Last message preview can be added here */}
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
            "flex-col",
            selectedConversation ? "flex" : "hidden md:flex"
        )}>
            {selectedConversation && otherUser ? (
                <>
                    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConversation(null)}>
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
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon"><Phone /></Button>
                            <Button variant="ghost" size="icon"><Video /></Button>
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
                <div className="flex-col items-center justify-center h-full text-center hidden md:flex">
                    <div className="p-8 rounded-lg bg-secondary/50">
                        <h2 className="text-2xl font-bold">Select a message</h2>
                        <p className="text-muted-foreground mt-2">Choose from your existing conversations, start a new one, and just keep swimming.</p>
                        <Button className="mt-6">New Message</Button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}
