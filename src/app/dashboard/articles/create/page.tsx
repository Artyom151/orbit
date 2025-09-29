
'use client';
import { useState, useRef } from "react";
import { useDatabase, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Image as ImageIcon, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { ref, push, set, serverTimestamp } from "firebase/database";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function CreateArticlePage() {
    const { user } = useUser();
    const db = useDatabase();
    const router = useRouter();
    const { toast } = useToast();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverImage(reader.result as string);
            }
            reader.readAsDataURL(file);
        }
    }

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim() || !user || !db) {
            toast({
                variant: 'destructive',
                title: 'Missing fields',
                description: 'Please provide a title and content for your article.',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const articlesRef = ref(db, 'articles');
            const newArticleRef = push(articlesRef);
            
            await set(newArticleRef, {
                title,
                content,
                authorId: user.uid,
                coverImage: coverImage || `https://picsum.photos/seed/${newArticleRef.key}/1200/600`,
                createdAt: serverTimestamp(),
            });

            toast({
                title: 'Article Published!',
                description: 'Your article is now live for everyone to see.',
            });

            router.push('/dashboard/articles');

        } catch (error) {
            console.error("Error creating article:", error);
            toast({
                variant: 'destructive',
                title: 'Something went wrong',
                description: 'Could not publish your article. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div>
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-2 px-4 border-b border-border flex items-center gap-2">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/dashboard/articles">
                        <ArrowLeft />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold">Create New Article</h1>
            </div>

            <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
                {coverImage ? (
                     <div className="relative aspect-video w-full">
                        <Image src={coverImage} alt="Cover image preview" layout="fill" className="object-cover rounded-lg" />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full" onClick={() => setCoverImage(null)}>
                            <X />
                        </Button>
                     </div>
                ) : (
                    <button 
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                    >
                        <ImageIcon className="size-8 mb-2" />
                        <span>Upload Cover Image</span>
                        <span className="text-xs">(Optional)</span>
                    </button>
                )}


                <Input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={imageInputRef} 
                    onChange={handleImageSelect}
                />
                
                <Input 
                    placeholder="Article Title..." 
                    className="text-3xl md:text-4xl font-bold h-auto p-0 border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                
                <Textarea 
                    placeholder="Tell your story... (Markdown is supported)"
                    className="text-lg min-h-96 resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent p-0"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />

                <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 animate-spin"/>}
                        {isSubmitting ? 'Publishing...' : 'Publish Article'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
