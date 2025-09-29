
'use client';

import { useUser, useDatabase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertCircle, Trash2, CheckCircle } from "lucide-react";
import { useList } from "@/firebase/rtdb/use-list";
import type { Report, Post, User } from "@/lib/types";
import { ref, remove, update, get } from "firebase/database";
import { PostCard } from "@/components/post-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";


const PasswordProtect = ({ onAuthenticated }: { onAuthenticated: () => void }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        // This is a simple, insecure password. In a real app, use a proper auth mechanism.
        if (password === 'dexile') {
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
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [reportedPosts, setReportedPosts] = useState<(Post & { user: User; reports: Report[] })[]>([]);

    const reportsQuery = useMemo(() => ref(db, 'reports'), [db]);
    const { data: reports, loading: loadingReports } = useList<Report>(reportsQuery);

    useEffect(() => {
        if (loadingReports) return;
        if (!reports.length) {
            setIsLoading(false);
            setReportedPosts([]);
            return;
        }

        const fetchReportDetails = async () => {
            setIsLoading(true);
            const groupedReports: Record<string, Report[]> = reports.reduce((acc, report) => {
                if (!acc[report.postId]) {
                    acc[report.postId] = [];
                }
                acc[report.postId].push(report);
                return acc;
            }, {} as Record<string, Report[]>);

            const postIds = Object.keys(groupedReports);
            const postPromises = postIds.map(id => get(ref(db, `posts/${id}`)));
            const postSnapshots = await Promise.all(postPromises);

            const userIds = new Set<string>();
            const postsMap = new Map<string, Post>();
            postSnapshots.forEach((snap, index) => {
                if (snap.exists()) {
                    const post = { id: snap.key, ...snap.val() } as Post;
                    postsMap.set(post.id, post);
                    userIds.add(post.userId);
                }
            });

            const userPromises = Array.from(userIds).map(id => get(ref(db, `users/${id}`)));
            const userSnapshots = await Promise.all(userPromises);
            const usersMap = new Map<string, User>();
            userSnapshots.forEach(snap => {
                if (snap.exists()) {
                    const user = { id: snap.key, ...snap.val() } as User;
                    usersMap.set(user.id, user);
                }
            });

            const finalReportedPosts = postIds.map(postId => {
                const post = postsMap.get(postId);
                if (!post) return null;
                const user = usersMap.get(post.userId);
                if (!user) return null;
                return {
                    ...post,
                    user,
                    reports: groupedReports[postId],
                };
            }).filter((p): p is Post & { user: User; reports: Report[] } => p !== null)
              .sort((a, b) => b.reports.length - a.reports.length);

            setReportedPosts(finalReportedPosts);
            setIsLoading(false);
        };

        fetchReportDetails();
    }, [reports, loadingReports, db]);


    const handleDismissReports = async (postId: string) => {
        const reportIds = reports.filter(r => r.postId === postId).map(r => r.id);
        const updates: Record<string, null> = {};
        reportIds.forEach(id => {
            updates[`/reports/${id}`] = null;
        });

        try {
            await update(ref(db), updates);
            toast({ title: 'Reports dismissed', description: 'The reports for this post have been cleared.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not dismiss reports.' });
        }
    };

    const handleDeletePost = async (postId: string) => {
         try {
            const updates: { [key: string]: any } = {};
            updates[`/posts/${postId}`] = null;
            updates[`/comments/${postId}`] = null;
            
            // Also delete associated reports
            const reportIds = reports.filter(r => r.postId === postId).map(r => r.id);
            reportIds.forEach(id => {
                updates[`/reports/${id}`] = null;
            });

            await update(ref(db), updates);
            toast({ title: 'Post Deleted', description: 'The post and its reports have been deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the post.' });
        }
    }


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
                            <div className="bg-background">
                                <PostCard post={post} />
                            </div>
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
                            <CardFooter className="bg-muted/50 p-2 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => handleDismissReports(post.id)}>
                                    <CheckCircle className="mr-2" />
                                    Dismiss Reports
                                </Button>
                                <Button variant="destructive" onClick={() => handleDeletePost(post.id)}>
                                    <Trash2 className="mr-2" />
                                    Delete Post
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <ShieldCheck className="mx-auto size-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-bold">All Clear!</h2>
                    <p className="text-muted-foreground">There are no active reports.</p>
                </div>
            )}
        </div>
    )
}

export default function ModerationPage() {
    const { user, loading } = useUser();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();

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
