import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, useGetNotifications, useMarkNotificationRead, getGetNotificationsQueryKey } from "@workspace/api-client-react";
import { 
  LayoutDashboard, BookOpen, GraduationCap, Users, Settings, 
  CreditCard, History, PenTool, LayoutTemplate,
  LogOut, User, Bell, ChevronDown, CheckCircle
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export function Sidebar() {
  const [location] = useLocation();
  const { data: user } = useGetMe();
  
  const isLocked = user && user.role !== 'admin' && !user.onboardingComplete && !user.onboardingExempt;
  
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, locked: isLocked },
    { name: "My Products", href: "/products", icon: BookOpen, locked: isLocked },
    { 
      name: "CREATE",
      items: [
        { name: "eBook / PDF Generator", href: "/create/ebook", icon: PenTool, locked: isLocked },
        { name: "Lead Magnet", href: "/create/lead-magnet", icon: LayoutTemplate, locked: isLocked },
      ]
    },
    {
      name: "LEARN",
      items: [
        ...(user?.onboardingComplete || user?.role === 'admin' ? [] : [{ name: "Onboarding", href: "/learn", icon: GraduationCap, locked: false }]),
        { name: "Academy", href: "/academy", icon: BookOpen, locked: isLocked },
      ]
    },
    ...(user?.role === 'manager' || user?.role === 'admin' ? [{
      name: "TEAM",
      items: [
        { name: "Review Queue", href: "/review", icon: CheckCircle, locked: isLocked },
        { name: "Team Products", href: "/products?scope=team", icon: Users, locked: isLocked },
      ]
    }] : []),
    ...(user?.role === 'admin' ? [{
      name: "ADMIN",
      items: [
        { name: "Users", href: "/admin/users", icon: Users, locked: false },
        { name: "Learn Curriculum", href: "/admin/curriculum", icon: GraduationCap, locked: false },
        { name: "Credits", href: "/admin/credits", icon: CreditCard, locked: false },
        { name: "Brand Kit", href: "/admin/brand", icon: PenTool, locked: false },
        { name: "Settings", href: "/admin/settings", icon: Settings, locked: false },
        { name: "Audit Log", href: "/admin/audit", icon: History, locked: false },
      ]
    }] : [])
  ];

  return (
    <div className="hidden md:flex flex-col w-64 border-r border-brand-900 grad-sidebar text-brand-100 min-h-[100dvh] fixed left-0 top-0 bottom-0 z-40">
      <div className="p-6">
        <Link href={isLocked ? "/learn" : "/dashboard"} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-lime-500 flex items-center justify-center text-brand-950 font-bold text-lg">
            D
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">DigiProducts</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-4 py-2">
        <nav className="space-y-6">
          {navigation.map((section, i) => (
            <div key={i}>
              {section.items ? (
                <div className="mb-2 px-2 text-xs font-semibold tracking-wider text-brand-400 uppercase">
                  {section.name}
                </div>
              ) : null}
              
              <ul className="space-y-1">
                {(section.items || [section]).map((item) => {
                  const active = location === item.href || location.startsWith(item.href + '/');
                  return (
                    <li key={item.name}>
                      <Link 
                        href={item.locked ? "/learn" : item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group",
                          active 
                            ? "bg-brand-700/50 text-white shadow-soft" 
                            : "text-brand-200 hover:bg-brand-800/50 hover:text-white"
                        )}
                        title={item.locked ? "Complete onboarding to unlock" : undefined}
                      >
                        <item.icon className={cn(
                          "w-4 h-4", 
                          active ? "text-lime-400" : "text-brand-400 group-hover:text-brand-300"
                        )} />
                        {item.name}
                        {item.locked && (
                          <div className="ml-auto w-4 h-4 rounded-full bg-brand-800 flex items-center justify-center">
                            <span className="text-[10px]">🔒</span>
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
      
      <div className="p-4 border-t border-brand-800/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-9 w-9 border border-brand-700">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-brand-800 text-brand-100">{user?.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
            <p className="text-xs text-brand-300 capitalize truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Topbar() {
  const { data: user } = useGetMe();
  const logout = useLogout();
  const { toast } = useToast();
  
  // Polling notifications every 30s
  const { data: notifications } = useGetNotifications({ query: { refetchInterval: 30000, queryKey: getGetNotificationsQueryKey() } });
  const markRead = useMarkNotificationRead();
  
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  
  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Failed to log out", variant: "destructive" });
      }
    });
  };

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-30 ml-0 md:ml-64">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle would go here */}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Credits Chip */}
        <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-gold-300/20 to-gold-400/20 border border-gold-300/30 px-3 py-1.5 rounded-full">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 shadow-sm flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">✨</span>
          </div>
          <span className="text-sm font-semibold text-gold-500">{user?.creditsBalance || 0}</span>
          <span className="text-xs font-medium text-gold-500/80 uppercase tracking-wide">Credits</span>
        </div>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-ink-500 hover:text-ink-900 rounded-full h-10 w-10">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive border-2 border-white" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 rounded-2xl shadow-xl border-ink-100">
            <div className="p-4 border-b border-ink-100 flex items-center justify-between">
              <h4 className="font-semibold">Notifications</h4>
              {unreadCount > 0 && <Badge variant="secondary" className="bg-brand-100 text-brand-700">{unreadCount} unread</Badge>}
            </div>
            <ScrollArea className="h-[300px]">
              {notifications?.length === 0 ? (
                <div className="p-8 text-center text-sm text-ink-500">No notifications</div>
              ) : (
                <div className="divide-y divide-ink-100">
                  {notifications?.map(notif => (
                    <div 
                      key={notif.id} 
                      className={cn(
                        "p-4 hover:bg-ink-100/50 transition-colors cursor-pointer",
                        !notif.isRead && "bg-brand-50/50"
                      )}
                      onClick={() => {
                        if (!notif.isRead) markRead.mutate({ notificationId: notif.id });
                        if (notif.linkPath) window.location.href = notif.linkPath;
                      }}
                    >
                      <p className="text-sm font-medium text-ink-900 mb-1">{notif.title}</p>
                      {notif.body && <p className="text-xs text-ink-500 mb-2 line-clamp-2">{notif.body}</p>}
                      <p className="text-[10px] text-ink-300 font-medium uppercase tracking-wide">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="pl-2 pr-4 h-10 rounded-full flex items-center gap-2 hover:bg-ink-100/50">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-bold">{user?.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-ink-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.fullName}</p>
                <p className="text-xs leading-none text-ink-500">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/account">
              <DropdownMenuItem className="cursor-pointer rounded-lg">
                <User className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive rounded-lg" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-paper">
      <Sidebar />
      <div className="flex flex-col min-h-[100dvh] md:pl-64">
        <Topbar />
        <main className="flex-1 flex flex-col relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
