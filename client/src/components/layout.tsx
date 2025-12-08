import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Keyboard, BarChart2, User, Settings, Trophy, LogOut, Sparkles, Github, Twitter, Mail, Globe, Zap, Shield, BookOpen, Users, Award, TrendingUp, Code, Book, Headphones, Star, Menu, X, MessageSquarePlus } from "lucide-react";
import FeedbackWidget from "@/components/FeedbackWidget";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const { data: gamificationData } = useQuery({
    queryKey: ["gamification"],
    queryFn: async () => {
      const response = await fetch("/api/gamification", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch gamification");
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const level = gamificationData?.gamification?.level || 1;
  const xp = gamificationData?.gamification?.experiencePoints || 0;
  const xpForNextLevel = level * 100;
  const xpInCurrentLevel = xp % 100;
  const xpProgress = (xpInCurrentLevel / 100) * 100;

  const primaryNavItems = [
    { href: "/", icon: Keyboard, label: "Type", description: "Practice typing with various texts and languages" },
    { href: "/code-mode", icon: Code, label: "Code Mode", description: "Practice typing real programming code" },
    { href: "/books", icon: Book, label: "Books", description: "Type passages from famous books" },
    { href: "/dictation-mode", icon: Headphones, label: "Dictation", description: "Listen and type what you hear" },
    { href: "/stress-test", icon: Zap, label: "Stress Test", description: "Test your typing under pressure" },
    { href: "/multiplayer", icon: Users, label: "Multiplayer", description: "Race against other players in real-time" },
  ];

  const secondaryNavItems = [
    { href: "/leaderboard", icon: Trophy, label: "Leaderboard", description: "See top typists and rankings" },
    { href: "/analytics", icon: BarChart2, label: "Analytics", description: "View your typing statistics and progress" },
    { href: "/chat", icon: Sparkles, label: "AI Chat", description: "Get AI-powered typing tips and help" },
    { href: "/profile", icon: User, label: "Profile", description: "View and edit your profile" },
    { href: "/settings", icon: Settings, label: "Settings", description: "Customize your typing experience" },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto px-2 h-12 flex items-center justify-between">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-mono font-bold text-lg">
              T
            </div>
            <h1 className="text-sm font-bold tracking-tight hidden lg:block">TypeMasterAI</h1>
          </div>

          <nav className="hidden md:flex items-center flex-1 justify-center">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-200 text-xs font-medium cursor-pointer whitespace-nowrap",
                          isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-card border-border">
                    <p className="text-sm">{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/profile">
                    <div 
                      className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer"
                      data-testid="xp-level-display"
                    >
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-[9px] shadow-lg shadow-amber-500/25">
                        {level}
                      </div>
                      <div className="flex flex-col gap-0 min-w-[50px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-semibold text-amber-500/90 uppercase tracking-wider">Lv {level}</span>
                          <span className="text-[8px] font-mono text-muted-foreground">{xpInCurrentLevel}/100</span>
                        </div>
                        <Progress 
                          value={xpProgress} 
                          className="h-0.5 bg-amber-950/30 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500"
                          data-testid="xp-progress-bar"
                        />
                      </div>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-card border-border">
                  <div className="text-sm">
                    <p className="font-semibold text-amber-500">Level {level}</p>
                    <p className="text-muted-foreground">{xpInCurrentLevel} / 100 XP to next level</p>
                    <p className="text-xs text-muted-foreground mt-1">Total: {xp} XP</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-7 w-7 rounded-full p-0">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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
                    {user.email?.toLowerCase() === "amar01pawar80@gmail.com" && (
                      <>
                        <Link href="/admin/feedback">
                          <DropdownMenuItem data-testid="button-admin-feedback">
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Feedback
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-1">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-[11px] h-7 px-2" data-testid="button-nav-login">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="text-[11px] h-7 px-2" data-testid="button-nav-register">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden h-7 w-7 p-0" data-testid="button-mobile-menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-mono font-bold text-lg">
                      T
                    </div>
                    TypeMasterAI
                  </SheetTitle>
                </SheetHeader>
                
                {user && (
                  <div className="p-4 border-b">
                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <div 
                        className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-500/25">
                          {level}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-amber-500/90">Level {level}</span>
                            <span className="text-xs font-mono text-muted-foreground">{xpInCurrentLevel}/100 XP</span>
                          </div>
                          <Progress 
                            value={xpProgress} 
                            className="h-2 bg-amber-950/30 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500"
                          />
                        </div>
                      </div>
                    </Link>
                  </div>
                )}

                <div className="p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
                  <div className="space-y-1">
                    {allNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.href;
                      return (
                        <Link key={item.href} href={item.href}>
                          <div
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium cursor-pointer",
                              isActive
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                            data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  
                  {!user && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <Link href="/login">
                        <Button variant="outline" className="w-full" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-button-login">
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/register">
                        <Button className="w-full" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-button-register">
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  )}
                  
                  {user && (
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        data-testid="mobile-button-logout"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16 pb-12 container mx-auto px-4">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-gradient-to-b from-card/30 to-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-5">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-4">
            {/* Brand Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center text-primary-foreground font-mono font-bold text-sm">
                  T
                </div>
                <h2 className="text-sm font-bold">TypeMasterAI</h2>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Master your typing speed with AI-powered tests and analytics.
              </p>
              <div className="flex gap-1.5">
                <FeedbackWidget 
                  triggerVariant="secondary"
                  triggerSize="sm"
                  triggerClassName="h-6 text-[10px] px-2"
                />
                <a
                  href="https://twitter.com/typemasterai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                  data-testid="link-twitter"
                  aria-label="Twitter"
                >
                  <Twitter className="w-3 h-3" />
                </a>
                <a
                  href="https://github.com/typemasterai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                  data-testid="link-github"
                  aria-label="GitHub"
                >
                  <Github className="w-3 h-3" />
                </a>
                <a
                  href="mailto:hello@typemasterai.com"
                  className="w-6 h-6 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                  data-testid="link-email"
                  aria-label="Email"
                >
                  <Mail className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-semibold text-xs mb-2">Product</h3>
              <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1.5" data-testid="link-footer-features">
                    <Keyboard className="w-3 h-3" />
                    Typing Tests
                  </Link>
                </li>
                <li>
                  <Link href="/leaderboard" className="hover:text-primary transition-colors flex items-center gap-1.5" data-testid="link-footer-leaderboard">
                    <Trophy className="w-3 h-3" />
                    Leaderboard
                  </Link>
                </li>
                <li>
                  <Link href="/chat" className="hover:text-primary transition-colors flex items-center gap-1.5" data-testid="link-footer-ai-chat">
                    <Sparkles className="w-3 h-3" />
                    AI Assistant
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="hover:text-primary transition-colors flex items-center gap-1.5" data-testid="link-footer-analytics">
                    <TrendingUp className="w-3 h-3" />
                    Analytics
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold text-xs mb-2">Resources</h3>
              <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                <li>
                  <Link href="/learn" className="hover:text-primary transition-colors" data-testid="link-footer-learn">
                    Learn to Type
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-primary transition-colors" data-testid="link-footer-blog">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary transition-colors" data-testid="link-footer-guides">
                    Contact Support
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors" data-testid="link-footer-help">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold text-xs mb-2">Legal</h3>
              <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                <li>
                  <Link href="/privacy-policy" className="hover:text-primary transition-colors flex items-center gap-1.5" data-testid="link-footer-privacy">
                    <Shield className="w-3 h-3" />
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="hover:text-primary transition-colors" data-testid="link-footer-terms">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/cookie-policy" className="hover:text-primary transition-colors" data-testid="link-footer-cookies">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-4 border-t border-border/40">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-accent/50 font-mono">v1.0.0</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Made with ❤️ for typing enthusiasts</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                © {new Date().getFullYear()} <span className="font-semibold text-foreground">TypeMasterAI</span>. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
