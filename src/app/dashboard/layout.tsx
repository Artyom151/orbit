'use client';

import { Bell, Bookmark, Compass, Home, Mail, MoreHorizontal, User, PanelLeftClose, PanelLeftOpen, Music, Library, Loader2, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { RightSidebar } from "@/components/right-sidebar";
import { SidebarProvider, useSidebar } from "@/components/sidebar-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "@/lib/auth-service";
import { Logo } from "@/components/logo";
import { MusicPlayer } from "@/components/music-player";
import { ThemeToggle } from "@/components/theme-toggle";


function DashboardSidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { user } = useUser();
  
  const handleLogout = async () => {
    await signOut();
  };

  if (!user) {
    return null;
  }
  
  const userInitial = user.displayName?.charAt(0) || "?";
  const username = user.username || user.email?.split('@')[0] || "user";

  return (
    <aside className={cn(
      "flex flex-col border-r border-border p-4 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-20 items-center" : "w-72"
    )}>
        <div className={cn(
          "flex items-center p-2 mb-4",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && <h1 className="text-2xl font-bold">Orbit</h1>}
          <Button variant="ghost" size="icon" className="rounded-full bg-background border hover:bg-secondary" onClick={toggleSidebar}>
              {isCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>
        </div>
        
        <nav className="flex flex-col gap-1 text-lg">
            <Link href="/dashboard" className={cn(
              "flex items-center gap-4 p-3 rounded-full font-bold hover:bg-secondary transition-colors",
              isCollapsed && "justify-center"
            )}>
                <Home className="size-6 shrink-0" />
                {!isCollapsed && <span>Home</span>}
            </Link>
            <Link href="/dashboard/explore" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isCollapsed && "justify-center"
            )}>
                <Compass className="size-6 shrink-0" />
                {!isCollapsed && <span>Explore</span>}
            </Link>
            <Link href="/dashboard/notifications" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isCollapsed && "justify-center"
            )}>
                <Bell className="size-6 shrink-0" />
                {!isCollapsed && <span>Notifications</span>}
            </Link>
            <Link href="/dashboard/messages" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isCollapsed && "justify-center"
            )}>
                <Mail className="size-6 shrink-0" />
                {!isCollapsed && <span>Messages</span>}
            </Link>
             <Link href="/dashboard/music" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isCollapsed && "justify-center"
            )}>
                <Music className="size-6 shrink-0" />
                {!isCollapsed && <span>Music</span>}
            </Link>
            <Link href="/dashboard/bookmarks" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isCollapsed && "justify-center"
            )}>
                <Bookmark className="size-6 shrink-0" />
                {!isCollapsed && <span>Bookmarks</span>}
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors w-full text-left",
                      isCollapsed && "justify-center"
                    )}>
                        <MoreHorizontal className="size-6 shrink-0" />
                        {!isCollapsed && <span>More</span>}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mb-2" align="start" forceMount>
                   <ThemeToggle />
                </DropdownMenuContent>
            </DropdownMenu>

            <Link href={`/dashboard/profile/${username}`} className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isCollapsed && "justify-center"
            )}>
                <User className="size-6 shrink-0" />
                {!isCollapsed && <span>Profile</span>}
            </Link>
        </nav>
        <div className="mt-auto">
          {user.username && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "relative h-auto w-full p-2 justify-start text-left rounded-full",
                    isCollapsed && "w-auto justify-center"
                  )}
                >
                    <div className={cn(
                      "flex items-center justify-between w-full",
                      isCollapsed ? "justify-center" : "gap-3"
                    )}>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
                            <AvatarFallback>{userInitial}</AvatarFallback>
                        </Avatar>
                        {!isCollapsed && (
                          <>
                            <div className="flex flex-col">
                                <span className="font-bold">{user.displayName}</span>
                                <span className="text-sm text-muted-foreground">@{user.username}</span>
                            </div>
                            <MoreHorizontal className="size-5" />
                          </>
                        )}
                    </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mb-2" align="start" forceMount>
                <DropdownMenuItem>
                    Add an existing account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                    Log out @{user.username}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
    </aside>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (!loading && user && !user.onboardingCompleted) {
        router.push('/onboarding');
    }
  }, [user, loading, router]);

  if (loading || !user?.username || !user?.onboardingCompleted) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p>Loading...</p>
            </div>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
          <DashboardSidebar />
          <main className="flex-1 flex">
            <div className="w-full max-w-2xl border-l border-r border-border">
              {children}
            </div>
            <RightSidebar />
          </main>
      </div>
      <MusicPlayer />
    </SidebarProvider>
  );
}
