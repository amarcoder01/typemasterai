import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Keyboard, BarChart2, User, Settings, Trophy, LogOut, Sparkles, Github, Twitter, Mail, Globe, Zap, Shield, BookOpen, Users, Award, TrendingUp, Code, Book, Headphones, Star, Menu, X } from "lucide-react";
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
    { href: "/", icon: Keyboard, label: "Type" },
    { href: "/code-mode", icon: Code, label: "Code Mode" },
    { href: "/books", icon: Book, label: "Books" },
    { href: "/dictation-mode", icon: Headphones, label: "Dictation" },
    { href: "/stress-test", icon: Zap, label: "Stress Test" },
    { href: "/multiplayer", icon: Users, label: "Multiplayer" },
  ];

  const secondaryNavItems = [
    { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { href: "/analytics", icon: BarChart2, label: "Analytics" },
    { href: "/chat", icon: Sparkles, label: "AI Chat" },
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-mono font-bold text-xl">
              T
            </div>
            <h1 className="text-lg font-bold tracking-tight hidden sm:block">TypeMasterAI</h1>
          </div>

          <nav className="hidden xl:flex items-center gap-0.5">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-200 text-xs font-medium cursor-pointer whitespace-nowrap",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {user && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/profile">
                    <div 
                      className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer"
                      data-testid="xp-level-display"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold text-[10px] shadow-lg shadow-amber-500/25">
                        {level}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-[60px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-semibold text-amber-500/90 uppercase tracking-wider">Lv {level}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{xpInCurrentLevel}/100</span>
                        </div>
                        <Progress 
                          value={xpProgress} 
                          className="h-1 bg-amber-950/30 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500"
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
                    <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
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
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-1">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-xs h-8" data-testid="button-nav-login">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="text-xs h-8" data-testid="button-nav-register">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="xl:hidden h-8 w-8 p-0" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
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

      <main className="flex-1 pt-20 pb-12 container mx-auto px-4">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center text-primary-foreground font-mono font-bold text-xl">
                  T
                </div>
                <h2 className="text-xl font-bold">TypeMasterAI</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Master your typing speed with AI-powered tests, real-time analytics, and personalized training. Join thousands of users improving their productivity.
              </p>
              <div className="flex gap-3">
                <a
                  href="https://twitter.com/typemasterai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                  data-testid="link-twitter"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://github.com/typemasterai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                  data-testid="link-github"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a
                  href="mailto:hello@typemasterai.com"
                  className="w-9 h-9 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                  data-testid="link-email"
                  aria-label="Email"
                >
                  <Mail className="w-4 h-4" />
                </a>
                <a
                  href="https://typemasterai.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                  data-testid="link-website"
                  aria-label="Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Product
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2" data-testid="link-footer-features">
                    <Keyboard className="w-3 h-3" />
                    Typing Tests
                  </Link>
                </li>
                <li>
                  <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2" data-testid="link-footer-leaderboard">
                    <Trophy className="w-3 h-3" />
                    Leaderboard
                  </Link>
                </li>
                <li>
                  <Link href="/chat" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2" data-testid="link-footer-ai-chat">
                    <Sparkles className="w-3 h-3" />
                    AI Assistant
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2" data-testid="link-footer-analytics">
                    <TrendingUp className="w-3 h-3" />
                    Analytics
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2" data-testid="link-footer-certificates">
                    <Award className="w-3 h-3" />
                    Certificates
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Resources
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-blog">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-guides">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-tips">
                    Improvement Tips
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-api">
                    API Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-help">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>

            {/* Company & Legal */}
            <div>
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Legal
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2" data-testid="link-footer-privacy">
                    <Shield className="w-3 h-3" />
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-terms">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/cookie-policy" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-cookies">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-careers">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@typemasterai.com" className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-footer-contact">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-border/40 mb-6">
            <div className="text-center" data-testid="stat-languages">
              <div className="text-2xl font-bold text-primary font-mono" data-testid="stat-languages-value">23+</div>
              <div className="text-xs text-muted-foreground mt-1">Languages</div>
            </div>
            <div className="text-center" data-testid="stat-users">
              <div className="text-2xl font-bold text-primary font-mono" data-testid="stat-users-value">10k+</div>
              <div className="text-xs text-muted-foreground mt-1">Active Users</div>
            </div>
            <div className="text-center" data-testid="stat-tests">
              <div className="text-2xl font-bold text-primary font-mono" data-testid="stat-tests-value">1M+</div>
              <div className="text-xs text-muted-foreground mt-1">Tests Completed</div>
            </div>
            <div className="text-center" data-testid="stat-ai">
              <div className="text-2xl font-bold text-primary font-mono" data-testid="stat-ai-value">AI</div>
              <div className="text-xs text-muted-foreground mt-1">Powered</div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="px-2 py-1 rounded bg-accent/50 font-mono">v1.0.0</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Made with ❤️ for typing enthusiasts</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} <span className="font-semibold text-foreground">TypeMasterAI</span>. All rights reserved. Master Your Typing with AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
