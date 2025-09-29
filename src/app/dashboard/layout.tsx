

'use client';

import { Bell, Bookmark, Compass, Home, Mail, MoreHorizontal, User, PanelLeftClose, PanelLeftOpen, Music, Library, Loader2, Moon, Sun, Menu, Users, Newspaper, Shield, Smile, Feather } from "lucide-react";
import Link from "next/link";
import { SidebarProvider, useSidebar } from "@/components/sidebar-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useUser, useDatabase, useList } from "@/firebase";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import { signOut } from "@/lib/auth-service";
import { Logo } from "@/components/logo";
import { MusicPlayer } from "@/components/music-player";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { onValue, ref, serverTimestamp, set, onDisconnect, query, orderByChild, equalTo } from "firebase/database";
import type { Notification } from "@/lib/types";
import { SetStatusDialog } from "@/components/set-status-dialog";
import { AccentColorToggle } from "@/components/accent-color-toggle";


function MobileSidebar() {
  const { user } = useUser();
  const db = useDatabase();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const notificationsQuery = useMemo(() => {
      if (!user || !db) return null;
      return query(ref(db, `notifications/${user.uid}`), orderByChild('read'), equalTo(false));
  }, [user, db]);

  const { data: unreadNotifications } = useList<Notification>(notificationsQuery);
  const hasUnreadNotifications = unreadNotifications.length > 0;

  const handleLogout = async () => {
    await signOut();
  };

  if (!user) {
    return null;
  }
  
  const userInitial = user.displayName?.charAt(0) || "?";
  const username = user.username || user.email?.split('@')[0] || "user";
  const isModerator = user.role === 'moderator' || user.role === 'developer';
  const isVideoAvatar = user.photoURL && user.photoURL.startsWith('data:video');
  
  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = pathname === href;
    return (
      <Link href={href} className={cn(
        "flex items-center gap-4 p-3 rounded-lg font-medium text-lg hover:bg-secondary transition-colors",
        isActive && "bg-secondary text-foreground"
        )} onClick={() => setIsOpen(false)}>
        {children}
      </Link>
    )
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
           <SheetTitle>
              <span className="text-xl font-bold">Orbit</span>
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
              <div className="relative">
                <Bell className="size-6 shrink-0" />
                {hasUnreadNotifications && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />}
              </div>
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
          <NavLink href="/dashboard/articles">
              <Feather className="size-6 shrink-0" />
              <span>Articles</span>
          </NavLink>
          <NavLink href="/dashboard/music">
              <Music className="size-6 shrink-0" />
              <span>Music</span>
          </NavLink>
          <NavLink href="/dashboard/bookmarks">
              <Bookmark className="size-6 shrink-0" />
              <span>Bookmarks</span>
          </NavLink>
          <NavLink href="/dashboard/moderation">
              <Shield className="size-6 shrink-0" />
              <span>Moderation</span>
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
                      {isVideoAvatar ? (
                        <video src={user.photoURL} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
                      )}
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
              <DropdownMenuContent className="w-56 mb-2" align="start">
                <SetStatusDialog>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Smile className="mr-2" />
                        Set status
                    </DropdownMenuItem>
                </SetStatusDialog>
                <DropdownMenuSeparator />
                <ThemeToggle />
                <AccentColorToggle />
                <DropdownMenuSeparator />
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
      </SheetContent>
    </Sheet>
  )
}


function DashboardSidebar() {
  const { isLeftSidebarCollapsed, toggleLeftSidebar } = useSidebar();
  const { user } = useUser();
  const db = useDatabase();
  const pathname = usePathname();
  
  const notificationsQuery = useMemo(() => {
      if (!user || !db) return null;
      return query(ref(db, `notifications/${user.uid}`), orderByChild('read'), equalTo(false));
  }, [user, db]);

  const { data: unreadNotifications } = useList<Notification>(notificationsQuery);
  const hasUnreadNotifications = unreadNotifications.length > 0;

  const handleLogout = async () => {
    await signOut();
  };

  if (!user) {
    return null;
  }
  
  const userInitial = user.displayName?.charAt(0) || "?";
  const username = user.username || user.email?.split('@')[0] || "user";
  const isVideoAvatar = user.photoURL && user.photoURL.startsWith('data:video');

  const NavLink = ({ href, children, isProfile = false }: { href: string; children: React.ReactNode; isProfile?: boolean }) => {
    const isActive = isProfile ? pathname.startsWith(href) : pathname === href;
    return (
        <Link href={href} className={cn(
            "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors text-lg",
            isLeftSidebarCollapsed && "justify-center",
            isActive ? "font-bold text-primary-foreground bg-primary" : "font-normal text-muted-foreground"
        )}>
            {children}
        </Link>
    );
  };

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
        
        <nav className="flex flex-col gap-1">
            <NavLink href="/dashboard">
                <Home className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Home</span>}
            </NavLink>
            <NavLink href="/dashboard/explore">
                <Compass className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Explore</span>}
            </NavLink>
            <NavLink href="/dashboard/notifications">
                <div className="relative">
                  <Bell className="size-6 shrink-0" />
                  {hasUnreadNotifications && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />}
                </div>
                {!isLeftSidebarCollapsed && <span>Notifications</span>}
            </NavLink>
            <NavLink href="/dashboard/messages">
                <Mail className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Messages</span>}
            </NavLink>
            <NavLink href="/dashboard/connections">
                <Users className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Connections</span>}
            </NavLink>
             <NavLink href="/dashboard/groups">
                <Newspaper className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Groups</span>}
            </NavLink>
             <NavLink href="/dashboard/articles">
                <Feather className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Articles</span>}
            </NavLink>
             <NavLink href="/dashboard/music">
                <Music className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Music</span>}
            </NavLink>
            <NavLink href="/dashboard/bookmarks">
                <Bookmark className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Bookmarks</span>}
            </NavLink>
            <NavLink href="/dashboard/moderation">
                <Shield className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Moderation</span>}
            </NavLink>
            <NavLink href={`/dashboard/profile/${username}`} isProfile>
                <User className="size-6 shrink-0" />
                {!isLeftSidebarCollapsed && <span>Profile</span>}
            </NavLink>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-4 p-3 rounded-full hover:bg-secondary transition-colors w-full text-left text-lg text-muted-foreground",
                      isLeftSidebarCollapsed && "justify-center"
                    )}>
                        <MoreHorizontal className="size-6 shrink-0" />
                        {!isLeftSidebarCollapsed && <span>More</span>}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mb-2" align="start">
                   <ThemeToggle />
                   <AccentColorToggle />
                </DropdownMenuContent>
            </DropdownMenu>
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
                            {isVideoAvatar ? (
                                <video src={user.photoURL} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
                            )}
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
              <DropdownMenuContent className="w-56 mb-2" align="start">
                <SetStatusDialog>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Smile className="mr-2" />
                        Set status
                    </DropdownMenuItem>
                </SetStatusDialog>
                <DropdownMenuSeparator />
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
  '/dashboard/articles': 'Articles',
  '/dashboard/music': 'Music',
  '/dashboard/bookmarks': 'Bookmarks',
  '/dashboard/moderation': 'Moderation',
};

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const pageTitle = PAGE_TITLES[pathname] || '';
  const isVideoAvatar = user?.photoURL && user.photoURL.startsWith('data:video');
  const userInitial = user?.displayName?.charAt(0) || "?";


  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col w-full">
        <div className="w-full lg:max-w-2xl border-x-0 lg:border-x border-border flex-1 flex flex-col">
           <div className="p-2 border-b border-border flex items-center justify-between lg:hidden sticky top-0 bg-background/80 backdrop-blur-sm z-30">
            <div className="flex items-center gap-4">
              <MobileSidebar />
               <h1 className="text-xl font-bold">{pageTitle}</h1>
            </div>
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    {isVideoAvatar ? (
                      <video src={user.photoURL!} loop autoPlay muted className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || ""} />
                    )}
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mr-2" align="end">
                  <SetStatusDialog>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Smile className="mr-2" />
                          Set status
                      </DropdownMenuItem>
                  </SetStatusDialog>
                  <DropdownMenuSeparator />
                  <ThemeToggle />
                  <AccentColorToggle />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                      Add an existing account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => await signOut()}>
                      Log out @{user.username}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
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
    } else if (!loading && user) {
        if (!user.onboardingCompleted) {
            router.push('/onboarding');
        }
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
