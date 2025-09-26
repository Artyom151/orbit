
'use client';

import { Bell, Bookmark, Compass, Home, Mail, MoreHorizontal, User, PanelLeftClose, PanelLeftOpen, Music, Library, Loader2, Moon, Sun, Menu, Users, Newspaper } from "lucide-react";
import Link from "next/link";
import { SidebarProvider, useSidebar } from "@/components/sidebar-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { useUser, useDatabase } from "@/firebase";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { signOut } from "@/lib/auth-service";
import { Logo } from "@/components/logo";
import { MusicPlayer } from "@/components/music-player";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { onValue, ref, serverTimestamp, set, onDisconnect } from "firebase/database";


function MobileSidebar() {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  if (!user) {
    return null;
  }
  
  const userInitial = user.displayName?.charAt(0) || "?";
  const username = user.username || user.email?.split('@')[0] || "user";
  
  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} className="flex items-center gap-4 p-3 rounded-lg font-medium text-lg hover:bg-secondary transition-colors" onClick={() => setIsOpen(false)}>
      {children}
    </Link>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
           <SheetTitle>
              <h1 className="text-xl font-bold">Orbit</h1>
           </SheetTitle>
        </SheetHeader>
        
        <nav className="flex flex-col gap-1 p-4">
          <NavLink href="/dashboard">
              <Home className="size-6 shrink-0" />
              <span>Home</span>
          </NavLink>
          <NavLink href="/dashboard/explore">
              <Compass className="size-6 shrink-0" />
              <span>Explore</span>
          </NavLink>
          <NavLink href="/dashboard/notifications">
              <Bell className="size-6 shrink-0" />
              <span>Notifications</span>
          </NavLink>
          <NavLink href="/dashboard/messages">
              <Mail className="size-6 shrink-0" />
              <span>Messages</span>
          </NavLink>
           <NavLink href="/dashboard/connections">
              <Users className="size-6 shrink-0" />
              <span>Connections</span>
          </NavLink>
           <NavLink href="/dashboard/groups">
              <Newspaper className="size-6 shrink-0" />
              <span>Groups</span>
          </NavLink>
          <NavLink href="/dashboard/music">
              <Music className="size-6 shrink-0" />
              <span>Music</span>
          </NavLink>
          <NavLink href="/dashboard/bookmarks">
              <Bookmark className="size-6 shrink-0" />
              <span>Bookmarks</span>
          </NavLink>
          <NavLink href={`/dashboard/profile/${username}`}>
              <User className="size-6 shrink-0" />
              <span>Profile</span>
          </NavLink>
        </nav>
        
        <div className="mt-auto p-4 border-t">
          {user.username && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-auto w-full p-2 justify-start text-left"
                >
                  <div className="flex items-center justify-between w-full gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
                      <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-bold">{user.displayName}</span>
                      <span className="text-sm text-muted-foreground">@{user.username}</span>
                    </div>
                    <MoreHorizontal className="size-5" />
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
                <ThemeToggle />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}


function DashboardSidebar() {
  const { isLeftSidebarCollapsed, toggleLeftSidebar } = useSidebar();
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
      "hidden lg:flex flex-col border-r border-border p-4 transition-all duration-300 ease-in-out",
      isLeftSidebarCollapsed ? "w-20 items-center" : "w-72"
    )}>
        <div className={cn(
          "flex items-center p-2 mb-4",
          isLeftSidebarCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isLeftSidebarCollapsed && <h1 className="text-2xl font-bold">Orbit</h1>}
          <Button variant="ghost" size="icon" className="rounded-full bg-background border hover:bg-secondary" onClick={toggleLeftSidebar}>
              {isLeftSidebarCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>
        </div>
        
        <nav className="flex flex-col gap-1 text-lg">
            <Link href="/dashboard" className={cn(
              "flex items-center gap-4 p-3 rounded-full font-bold hover:bg-secondary transition-colors",
              isLeftSidebarCollapsed && "justify-center"
            )}>
                <Home className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Home</span>}
            </Link>
            <Link href="/dashboard/explore" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isLeftSidebarCollapsed && "justify-center"
            )}>
                <Compass className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Explore</span>}
            </Link>
            <Link href="/dashboard/notifications" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isLeftSidebarCollapsed && "justify-center"
            )}>
                <Bell className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Notifications</span>}
            </Link>
            <Link href="/dashboard/messages" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isLeftSidebarCollapsed && "justify-center"
            )}>
                <Mail className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Messages</span>}
            </Link>
            <Link href="/dashboard/connections" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isLeftSidebarCollapsed && "justify-center"
            )}>
                <Users className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Connections</span>}
            </Link>
             <Link href="/dashboard/groups" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isLeftSidebarCollapsed && "justify-center"
            )}>
                <Newspaper className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Groups</span>}
            </Link>
             <Link href="/dashboard/music" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isLeftSidebarCollapsed && "justify-center"
            )}>
                <Music className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Music</span>}
            </Link>
            <Link href="/dashboard/bookmarks" className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isLeftSidebarCollapsed && "justify-center"
            )}>
                <Bookmark className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Bookmarks</span>}
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors w-full text-left",
                      isLeftSidebarCollapsed && "justify-center"
                    )}>
                        <MoreHorizontal className="size-6 shrink-0" />
                        {!isLeftSidebarCollapsed && <span>More</span>}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mb-2" align="start" forceMount>
                   <ThemeToggle />
                </DropdownMenuContent>
            </DropdownMenu>

            <Link href={`/dashboard/profile/${username}`} className={cn(
              "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors",
              isLeftSidebarCollapsed && "justify-center"
            )}>
                <User className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Profile</span>}
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
                    isLeftSidebarCollapsed && "w-auto justify-center"
                  )}
                >
                    <div className={cn(
                      "flex items-center justify-between w-full",
                      isLeftSidebarCollapsed ? "justify-center" : "gap-3"
                    )}>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
                            <AvatarFallback>{userInitial}</AvatarFallback>
                        </Avatar>
                        {!isLeftSidebarCollapsed && (
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

const PAGE_TITLES: { [key: string]: string } = {
  '/dashboard': 'Home',
  '/dashboard/explore': 'Explore',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/messages': 'Messages',
  '/dashboard/connections': 'Connections',
  '/dashboard/groups': 'Groups',
  '/dashboard/music': 'Music',
  '/dashboard/bookmarks': 'Bookmarks',
};

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const pageTitle = PAGE_TITLES[pathname] || '';

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 flex w-full">
        <div className="w-full lg:max-w-2xl border-x-0 lg:border-x border-border">
           <div className="p-2 border-b border-border flex items-center justify-between lg:hidden sticky top-0 bg-background/80 backdrop-blur-sm z-30">
            <div className="flex items-center gap-4">
              <MobileSidebar />
               <h1 className="text-xl font-bold">{pageTitle}</h1>
            </div>
          </div>
          {children}
        </div>
      </main>
      <MusicPlayer />
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const db = useDatabase();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (!loading && user && !user.onboardingCompleted) {
        router.push('/onboarding');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (!user || !db) return;

    const userStatusDatabaseRef = ref(db, '/status/' + user.uid);
    const amOnline = ref(db, '.info/connected');

    const unsubscribe = onValue(amOnline, (snapshot) => {
        if (snapshot.val() === false) {
            set(userStatusDatabaseRef, {
                state: 'offline',
                last_changed: serverTimestamp(),
            });
            return;
        }

        onDisconnect(userStatusDatabaseRef).set({
            state: 'offline',
            last_changed: serverTimestamp(),
        }).then(() => {
            set(userStatusDatabaseRef, {
                state: 'online',
                last_changed: serverTimestamp(),
            });
        });
    });

    return () => unsubscribe();
  }, [user, db]);

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
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
