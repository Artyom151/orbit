

'use client';
import type { Article, User } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatDistanceToNow } from "date-fns";

type ArticleCardProps = {
    article: Article & { author: User };
};

export function ArticleCard({ article }: ArticleCardProps) {
    
    const readingTime = Math.ceil(article.content.split(' ').length / 200);
    const isVideoAvatar = article.author.avatar && article.author.avatar.startsWith('data:video');

    return (
        <Link href={`/dashboard/articles/${article.id}`}>
            <article className="space-y-4 group">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <Image 
                        src={article.coverImage || `https://picsum.photos/seed/${article.id}/1200/600`} 
                        alt={article.title} 
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">{article.title}</h2>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 border-none">
                                {isVideoAvatar ? (
                                    <video src={article.author.avatar} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <AvatarImage src={article.author.avatar} />
                                )}
                                <AvatarFallback>{article.author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{article.author.name}</span>
                        </div>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}</span>
                        <span>·</span>
                        <span>{readingTime} min read</span>
                    </div>
                </div>
            </article>
        </Link>
    )
}
