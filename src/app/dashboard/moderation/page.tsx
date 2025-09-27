
'use client';

import { useUser, useDatabase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { useList } from "@/firebase/rtdb/use-list";
import type { Report, Post, User } from "@/lib/types";
import { ref } from "firebase/database";
import { PostCard } from "@/components/post-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatDistanceToNow } from "date-fns";


const PasswordProtect = ({ onAuthenticated }: { onAuthenticated: () => void }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        // Simple password check
        if (password === 'DEXILEorbit') {
            onAuthenticated();
        } else {
            setError('Incorrect password.');
        }
        setLoading(false);
    }

    return (
        <div className="flex items-center justify-center h-full p-8">
            <Card className="w-full max-w-sm">
                 <CardHeader className="items-center text-center">
                    <ShieldCheck className="size-12 text-primary" />
                    <CardTitle>Moderation Panel</CardTitle>
                    <CardDescription>Please enter the password to continue.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input 
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 animate-spin" />}
                            Authenticate
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}


const ModerationDashboard = () => {
    const db = useDatabase();

    const reportsQuery = useMemo(() => ref(db, 'reports'), [db]);
    const postsQuery = useMemo(() => ref(db, 'posts'), [db]);
    const usersQuery = useMemo(() => ref(db, 'users'), [db]);

    const { data: reports, loading: loadingReports } = useList<Omit<Report, 'post'>>(reportsQuery);
    const { data: posts, loading: loadingPosts } = useList<Post>(postsQuery);
    const { data: users, loading: loadingUsers } = useList<User>(usersQuery);

    const reportedPosts = useMemo(() => {
        if (!reports.length || !posts.length || !users.length) return [];

        const postsMap = new Map(posts.map(p => [p.id, p]));
        const usersMap = new Map(users.map(u => [u.id, u]));

        const groupedReports: Record<string, Report[]> = reports.reduce((acc, report) => {
            if (!acc[report.postId]) {
                acc[report.postId] = [];
            }
            acc[report.postId].push(report);
            return acc;
        }, {} as Record<string, Report[]>);

        return Object.entries(groupedReports)
            .map(([postId, postReports]) => {
                const post = postsMap.get(postId);
                if (!post) return null;
                const user = usersMap.get(post.userId);
                if (!user) return null;
                
                return {
                    ...post,
                    user,
                    reports: postReports,
                };
            })
            .filter((p): p is Post & { user: User; reports: Report[] } => p !== null)
            .sort((a, b) => b.reports.length - a.reports.length);

    }, [reports, posts, users]);


    const isLoading = loadingReports || loadingPosts || loadingUsers;

    return (
        <div>
             <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border">
                <h1 className="text-xl font-bold">Moderation</h1>
            </div>
            {isLoading ? (
                <div className="p-4 text-center">
                    <Loader2 className="mx-auto animate-spin" />
                </div>
            ) : reportedPosts.length > 0 ? (
                <div className="space-y-4 p-4">
                    {reportedPosts.map(post => (
                        <Card key={post.id} className="overflow-hidden">
                            <CardHeader className="bg-destructive/10">
                                <CardTitle className="flex items-center gap-2 text-destructive">
                                    <AlertCircle />
                                    <span>{post.reports.length} Report{post.reports.length > 1 ? 's' : ''}</span>
                                </CardTitle>
                            </CardHeader>
                            <PostCard post={post} />
                             <Accordion type="single" collapsible className="w-full border-t">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger className="px-4">View Report Details</AccordionTrigger>
                                    <AccordionContent className="px-4 pb-4">
                                        <div className="space-y-2">
                                            {post.reports.map((report, index) => (
                                                <div key={index} className="text-sm p-2 bg-secondary rounded-md">
                                                    <p className="font-semibold">{report.reason}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Reported by user {report.reportedBy} · {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </Card>
                    ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-8">No active reports.</p>
            )}
        </div>
    )
}

export default function ModerationPage() {
    const { user, loading } = useUser();
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'moderator' && user.role !== 'developer'))) {
            router.push('/dashboard');
        }
    }, [user, loading, router]);
    
    if (loading || !user) {
         return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <PasswordProtect onAuthenticated={() => setIsAuthenticated(true)} />;
    }

    return <ModerationDashboard />;
}
