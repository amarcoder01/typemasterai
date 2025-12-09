import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Home, 
  Search, 
  Keyboard, 
  Code, 
  Users, 
  Trophy, 
  BarChart3, 
  BookOpen, 
  Mic, 
  Zap, 
  HelpCircle,
  ArrowRight,
  Gamepad2,
  Target,
  Award
} from "lucide-react";
import { useState } from "react";
import { useSEO } from "@/lib/seo";

export default function NotFound() {
  const [searchQuery, setSearchQuery] = useState("");

  useSEO({
    title: "Page Not Found | TypeMasterAI - Free Typing Test",
    description: "Oops! The page you're looking for doesn't exist. Try our free typing test, code typing mode, or multiplayer racing instead.",
    canonical: "https://typemaster-ai.replit.app/404",
  });

  const popularPages = [
    { name: "Home - Typing Test", href: "/", icon: Home, description: "Start a free typing test" },
    { name: "Code Typing Mode", href: "/code-mode", icon: Code, description: "Practice typing code in 20+ languages" },
    { name: "Multiplayer Racing", href: "/multiplayer", icon: Users, description: "Race against other typists live" },
    { name: "Global Leaderboard", href: "/leaderboard", icon: Trophy, description: "See the fastest typists" },
    { name: "Analytics Dashboard", href: "/analytics", icon: BarChart3, description: "View your typing stats" },
    { name: "Stress Test", href: "/stress-test", icon: Zap, description: "Type under pressure" },
  ];

  const quickLinks = [
    { name: "1-Minute Typing Test", href: "/1-minute-typing-test" },
    { name: "3-Minute Typing Test", href: "/3-minute-typing-test" },
    { name: "5-Minute Typing Test", href: "/5-minute-typing-test" },
    { name: "Code Leaderboard", href: "/code-leaderboard" },
    { name: "Stress Leaderboard", href: "/stress-leaderboard" },
    { name: "Dictation Mode", href: "/dictation-mode" },
    { name: "Book Typing", href: "/books" },
    { name: "AI Chat Assistant", href: "/chat" },
    { name: "Learn Typing", href: "/learn" },
    { name: "Your Profile", href: "/profile" },
    { name: "Settings", href: "/settings" },
    { name: "About Us", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  const alternativePages = [
    { name: "Monkeytype Alternative", href: "/monkeytype-alternative" },
    { name: "TypeRacer Alternative", href: "/typeracer-alternative" },
    { name: "10FastFingers Alternative", href: "/10fastfingers-alternative" },
    { name: "Typing.com Alternative", href: "/typingcom-alternative" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-8 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 mb-6">
            <span className="text-6xl">🔍</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            404 - Page Not Found
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-2">
            Oops! Looks like this page took a typing break.
          </p>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            The page you're looking for doesn't exist or has been moved. 
            But don't worry - there's plenty more to explore!
          </p>
        </div>

        {/* Search Bar */}
        <Card className="bg-slate-800/50 border-slate-700 max-w-xl mx-auto mb-12">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search TypeMasterAI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                  data-testid="input-404-search"
                />
              </div>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                data-testid="button-404-search"
              >
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Back to Home CTA */}
        <div className="text-center mb-12">
          <Link href="/">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-8 py-6"
              data-testid="button-back-home"
            >
              <Home className="mr-2 h-5 w-5" />
              Back to Typing Test
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Popular Pages Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            <Keyboard className="inline-block mr-2 h-6 w-6 text-cyan-400" />
            Popular Pages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularPages.map((page) => (
              <Link key={page.href} href={page.href}>
                <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 transition-all cursor-pointer h-full">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                      <page.icon className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{page.name}</h3>
                      <p className="text-sm text-slate-400">{page.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* More Pages */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-cyan-400" />
                More Features
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span className="text-slate-300 hover:text-cyan-400 transition-colors text-sm block py-1 cursor-pointer">
                      → {link.name}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alternative Pages */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-cyan-400" />
                Compare TypeMasterAI
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                See how TypeMasterAI compares to other popular typing test sites:
              </p>
              <div className="space-y-2">
                {alternativePages.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span className="text-slate-300 hover:text-cyan-400 transition-colors text-sm block py-1 cursor-pointer">
                      → {link.name}
                    </span>
                  </Link>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-cyan-400" />
                  Need Help?
                </h4>
                <div className="space-y-2">
                  <Link href="/contact">
                    <span className="text-slate-300 hover:text-cyan-400 transition-colors text-sm block py-1 cursor-pointer">
                      → Contact Support
                    </span>
                  </Link>
                  <Link href="/privacy-policy">
                    <span className="text-slate-300 hover:text-cyan-400 transition-colors text-sm block py-1 cursor-pointer">
                      → Privacy Policy
                    </span>
                  </Link>
                  <Link href="/terms-of-service">
                    <span className="text-slate-300 hover:text-cyan-400 transition-colors text-sm block py-1 cursor-pointer">
                      → Terms of Service
                    </span>
                  </Link>
                  <Link href="/accessibility">
                    <span className="text-slate-300 hover:text-cyan-400 transition-colors text-sm block py-1 cursor-pointer">
                      → Accessibility
                    </span>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fun Typing Tip */}
        <Card className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/30 max-w-2xl mx-auto">
          <CardContent className="p-6 text-center">
            <Gamepad2 className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">
              While you're here...
            </h3>
            <p className="text-slate-300 mb-4">
              Did you know? The average typing speed is 40 WPM, but with regular practice on TypeMasterAI, 
              you can reach 80+ WPM in just a few weeks!
            </p>
            <Link href="/">
              <Button 
                variant="outline" 
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                data-testid="button-start-practice"
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Start Practicing Now
              </Button>
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
