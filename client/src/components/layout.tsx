import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Keyboard, BarChart2, User, Settings, Trophy, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", icon: Keyboard, label: "Type" },
    { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { href: "/chat", icon: Sparkles, label: "AI Chat" },
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-mono font-bold text-xl">
              T
            </div>
            <h1 className="text-xl font-bold tracking-tight">TypeMasterAI</h1>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium cursor-pointer",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </div>
                </Link>
              );
            })}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="ml-2 h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.username}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" data-testid="button-nav-login">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" data-testid="button-nav-register">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-24 pb-12 container mx-auto px-4">
        {children}
      </main>

      <footer className="py-6 border-t border-border/40 text-center text-muted-foreground text-xs">
        <div className="flex items-center justify-center gap-4 mb-2">
          <span className="px-2 py-1 rounded bg-accent/50 font-mono">v1.0.0</span>
          <span className="px-2 py-1 rounded bg-accent/50 font-mono">git: main</span>
        </div>
        <p>© 2025 TypeMasterAI. Master Your Typing with AI.</p>
      </footer>
    </div>
  );
}
