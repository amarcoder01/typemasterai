import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Keyboard, BarChart2, User, Settings, Trophy, LogOut, Sparkles, Github, Twitter, Mail, Globe, Zap, Shield, BookOpen, Users, Award, TrendingUp } from "lucide-react";
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
    { href: "/multiplayer", icon: Users, label: "Multiplayer" },
    { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
    { href: "/analytics", icon: BarChart2, label: "Analytics" },
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
