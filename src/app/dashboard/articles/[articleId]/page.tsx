
'use client';

import { useMemo } from 'react';
import { useDatabase } from '@/firebase';
import { useObject } from '@/firebase/rtdb/use-object';
import type { Article, User } from '@/lib/types';
import { ref } from 'firebase/database';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

// A simple markdown renderer
const MarkdownRenderer = ({ content }: { content: string }) => {
    const html = content
        .split('\n')
        .map(line => {
            if (line.startsWith('### ')) return `<h3 class="text-xl font-bold mt-6 mb-2">${line.substring(4)}</h3>`;
            if (line.startsWith('## ')) return `<h2 class="text-2xl font-bold mt-8 mb-3">${line.substring(3)}</h2>`;
            if (line.startsWith('# ')) return `<h1 class="text-3xl font-bold mt-10 mb-4">${line.substring(2)}</h1>`;
            if (line.trim() === '---') return '<hr class="my-8" />';
            if (line.startsWith('> ')) return `<blockquote class="border-l-4 border-primary pl-4 italic my-4">${line.substring(2)}</blockquote>`;
            return line ? `<p class="my-4 leading-relaxed">${line}</p>` : '<br />';
        })
        .join('');

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
};


export default function ArticlePage({ params }: { params: { articleId: string } }) {
    const { articleId } = params;
    const db = useDatabase();

    const articleRef = useMemo(() => ref(db, `articles/${articleId}`), [db, articleId]);
    const { data: article, loading: loadingArticle } = useObject<Article>(articleRef);
    
    const authorRef = useMemo(() => {
        if (!article?.authorId) return null;
        return ref(db, `users/${article.authorId}`);
    }, [db, article?.authorId]);
    const { data: author, loading: loadingAuthor } = useObject<User>(authorRef);

    if (loadingArticle || loadingAuthor) {
        return (
            <div className="flex justify-center items-center h-full min-h-screen">
                <Loader2 className="animate-spin" />
            </div>
        );
    }
    
    if (!article) {
         return (
            <div className="p-4 text-center">
                <p>Article not found.</p>
                <Button asChild variant="link"><Link href="/dashboard/articles">Go back</Link></Button>
            </div>
         )
    }

    return (
        <div>
             <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-2 px-4 border-b border-border flex items-center gap-2">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/dashboard/articles">
                        <ArrowLeft />
                    </Link>
                </Button>
                <div className='min-w-0'>
                    <p className='font-bold truncate'>{article.title}</p>
                    {author && <p className='text-sm text-muted-foreground truncate'>by {author.name}</p>}
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-8">
                 <div className="relative aspect-video w-full mb-8">
                    <Image 
                        src={article.coverImage || `https://picsum.photos/seed/${article.id}/1200/600`} 
                        alt={article.title} 
                        fill
                        className="object-cover rounded-lg"
                    />
                </div>

                <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{article.title}</h1>
                
                {author && (
                    <div className="flex items-center gap-4 mb-8">
                        <Avatar className="h-12 w-12 border-none">
                            <AvatarImage src={author.avatar} />
                            <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold">{author.name}</p>
                            <p className="text-sm text-muted-foreground">
                                Published on {format(new Date(article.createdAt), 'MMMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                )}
                
                <div className="prose prose-lg dark:prose-invert max-w-none text-foreground text-lg">
                    <MarkdownRenderer content={article.content} />
                </div>
            </div>
        </div>
    )
}
