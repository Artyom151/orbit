'use client';

import { Bell, Bookmark, Compass, Home, Mail, MoreHorizontal, User, PanelLeftClose, PanelLeftOpen, Music, Library, Loader2, Moon, Sun, Menu } from "lucide-react";
import Link from "next/link";
import { RightSidebar } from "@/components/right-sidebar";
import { SidebarProvider, useSidebar } from "@/components/sidebar-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/lib/auth-service";
import { Logo } from "@/components/logo";
import { MusicPlayer } from "@/components/music-player";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";


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
          <Menu className="size-6"/>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-4 flex flex-col">
        <div className="p-2 mb-4">
          <h1 className="text-2xl font-bold">Orbit</h1>
        </div>
        
        <nav className="flex flex-col gap-1">
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
        
        <div className="mt-auto">
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
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="ml-2">Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <ThemeToggle />
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}


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
      "hidden lg:flex flex-col border-r border-border p-4 transition-all duration-300 ease-in-out",
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
          <main className="flex-1 flex w-full">
             <div className="w-full lg:max-w-2xl border-x-0 lg:border-x border-border">
              <div className="p-2 border-b border-border flex items-center gap-4 lg:hidden sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                  <MobileSidebar />
                  <h1 className="text-xl font-bold">Home</h1>
              </div>
              {children}
            </div>
            <div className="hidden xl:block">
              <RightSidebar />
            </div>
          </main>
      </div>
      <MusicPlayer />
    </SidebarProvider>
  );
}
