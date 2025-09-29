
'use client';

import { Button } from "@/components/ui/button";
import { useDatabase, useUser } from "@/firebase";
import { useList } from "@/firebase/rtdb/use-list";
import type { Article, User } from "@/lib/types";
import { ref } from "firebase/database";
import { Feather, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ArticleCard } from "@/components/article-card";
import { Skeleton } from "@/components/ui/skeleton";


const ArticleSkeleton = () => (
    <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    </div>
)

export default function ArticlesPage() {
    const db = useDatabase();

    const articlesQuery = useMemo(() => ref(db, 'articles'), [db]);
    const usersQuery = useMemo(() => ref(db, 'users'), [db]);

    const { data: articlesData, loading: loadingArticles } = useList<Article>(articlesQuery);
    const { data: usersData, loading: loadingUsers } = useList<User>(usersQuery);
    
    const articlesWithAuthors = useMemo(() => {
        if (!articlesData.length || !usersData.length) return [];
        
        const usersMap = new Map(usersData.map(u => [u.id, u]));

        return articlesData
            .map(article => {
                const author = usersMap.get(article.authorId);
                return author ? { ...article, author } : null;
            })
            .filter((a): a is Article & { author: User } => a !== null)
            .sort((a,b) => b.createdAt - a.createdAt);
            
    }, [articlesData, usersData]);

    const isLoading = loadingArticles || loadingUsers;

    return (
        <div>
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4 border-b border-border flex justify-between items-center">
                <h1 className="text-xl font-bold">Articles</h1>
                <Button asChild>
                    <Link href="/dashboard/articles/create">
                        <Plus className="mr-2"/>
                        Write Article
                    </Link>
                </Button>
            </div>
            
            <div className="p-4 grid gap-8">
                {isLoading ? (
                    <>
                        <ArticleSkeleton />
                        <ArticleSkeleton />
                    </>
                ) : articlesWithAuthors.length > 0 ? (
                    articlesWithAuthors.map(article => (
                        <ArticleCard key={article.id} article={article} />
                    ))
                ) : (
                     <div className="text-center py-16">
                        <Feather className="mx-auto size-12 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-bold">No articles yet</h2>
                        <p className="text-muted-foreground">Be the first to share your story.</p>
                         <Button asChild className="mt-4">
                            <Link href="/dashboard/articles/create">
                                <Plus className="mr-2"/>
                                Write Article
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
