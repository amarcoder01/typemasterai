import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BookOpen,
  Zap,
  Trophy,
  Target,
  Brain,
  Users,
  BarChart3,
  Code,
  Mic,
  Flame,
  Sparkles,
  Award,
  TrendingUp,
  Clock,
  Keyboard,
  Eye,
  Volume2,
  Settings,
  Share2,
  Globe,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Download,
  Shield,
  Rocket,
  Star,
  BookMarked,
  Headphones,
  Skull,
  Hash,
  Gauge,
  Binary,
  Fingerprint,
  Activity,
  PieChart,
  LineChart,
  Map,
  Crown,
  Medal,
  Heart,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

export default function LearnPage() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const sections = [
    { id: "getting-started", label: "Getting Started", icon: Rocket },
    { id: "typing-modes", label: "Typing Modes", icon: Keyboard },
    { id: "multiplayer", label: "Multiplayer", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "achievements", label: "Achievements", icon: Trophy },
    { id: "advanced", label: "Advanced Features", icon: Sparkles },
    { id: "tips", label: "Tips & Tricks", icon: Lightbulb },
    { id: "faq", label: "FAQ", icon: HelpCircle },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white mb-6">
          <BookOpen className="w-10 h-10" />
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Complete TypeMasterAI Guide
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Master every feature, unlock your potential, and become a typing champion. This comprehensive guide covers everything you need to know.
        </p>
      </motion.div>

      {/* Quick Navigation */}
      <Card className="mb-8 sticky top-4 z-10 backdrop-blur-lg bg-card/95">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => scrollToSection(section.id)}
                  className="gap-2"
                  data-testid={`nav-${section.id}`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-8">
        {/* Getting Started Section */}
        <motion.section
          id="getting-started"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="scroll-mt-24"
        >
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Rocket className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-3xl">Getting Started</CardTitle>
                  <CardDescription>Begin your typing journey in 3 simple steps</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                        1
                      </div>
                      <CardTitle className="text-lg">Create Account</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Sign up to save progress, unlock achievements, and compete on leaderboards.
                    </p>
                    <Button asChild size="sm" variant="outline" data-testid="button-register">
                      <Link href="/register">
                        Sign Up Free <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                        2
                      </div>
                      <CardTitle className="text-lg">Take a Test</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Start with a quick 60-second typing test to establish your baseline speed.
                    </p>
                    <Button asChild size="sm" variant="outline" data-testid="button-start-test">
                      <Link href="/">
                        Start Test <PlayCircle className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                        3
                      </div>
                      <CardTitle className="text-lg">Track Progress</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      View detailed analytics and AI-powered insights to improve your skills.
                    </p>
                    <Button asChild size="sm" variant="outline" data-testid="button-analytics">
                      <Link href="/analytics">
                        View Analytics <BarChart3 className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 border border-border">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Pro Tip: Guest Mode Available
                </h4>
                <p className="text-sm text-muted-foreground">
                  You can start typing immediately without creating an account! However, your progress won't be saved. We recommend creating a free account to unlock all features including analytics, achievements, and multiplayer racing.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Typing Modes Section */}
        <motion.section
          id="typing-modes"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="scroll-mt-24"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Keyboard className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-3xl">Typing Test Modes</CardTitle>
                  <CardDescription>Choose from 6+ specialized typing modes to match your goals</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="standard" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
                  <TabsTrigger value="standard" data-testid="tab-standard">Standard</TabsTrigger>
                  <TabsTrigger value="code" data-testid="tab-code">Code</TabsTrigger>
                  <TabsTrigger value="book" data-testid="tab-book">Book</TabsTrigger>
                  <TabsTrigger value="dictation" data-testid="tab-dictation">Dictation</TabsTrigger>
                  <TabsTrigger value="stress" data-testid="tab-stress">Stress</TabsTrigger>
                  <TabsTrigger value="multiplayer" data-testid="tab-multiplayer">Multiplayer</TabsTrigger>
                </TabsList>

                <TabsContent value="standard" className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/10">
                      <Zap className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">Standard Typing Test</h3>
                      <p className="text-muted-foreground mb-4">
                        The classic typing experience with AI-generated paragraphs tailored to your skill level.
                      </p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Features
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Multiple time limits (15s, 30s, 60s, 120s, 180s)</li>
                            <li>• 23+ language support</li>
                            <li>• Adjustable difficulty levels</li>
                            <li>• Real-time WPM and accuracy tracking</li>
                            <li>• Customizable themes and sounds</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Target className="w-4 h-4 text-orange-500" />
                            Best For
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Beginners starting their journey</li>
                            <li>• General typing skill improvement</li>
                            <li>• Daily practice sessions</li>
                            <li>• Speed benchmarking</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button asChild size="sm" data-testid="button-try-standard">
                          <Link href="/">Try Standard Test</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" data-testid="button-1min">
                          <Link href="/1-minute-typing-test">1 Min Test</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" data-testid="button-3min">
                          <Link href="/3-minute-typing-test">3 Min Test</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <Code className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">Code Typing Mode</h3>
                      <p className="text-muted-foreground mb-4">
                        Master typing code with syntax highlighting and real programming snippets in 50+ languages.
                      </p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Binary className="w-4 h-4 text-green-500" />
                            Languages Supported
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {["JavaScript", "TypeScript", "Python", "Java", "C++", "Go", "Rust", "Swift", "Ruby", "PHP", "HTML", "CSS"].map((lang) => (
                              <Badge key={lang} variant="secondary" className="text-xs">
                                {lang}
                              </Badge>
                            ))}
                            <Badge variant="outline" className="text-xs">+40 more</Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            Unique Features
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• AI-generated code snippets</li>
                            <li>• Syntax highlighting</li>
                            <li>• Line numbers & indentation guides</li>
                            <li>• Difficulty: Easy, Medium, Hard</li>
                            <li>• Language-specific leaderboards</li>
                          </ul>
                        </div>
                      </div>

                      <Button asChild size="sm" data-testid="button-try-code">
                        <Link href="/code-mode">
                          <Code className="w-4 h-4 mr-2" />
                          Try Code Mode
                        </Link>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="book" className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <BookMarked className="w-6 h-6 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">Book Mode</h3>
                      <p className="text-muted-foreground mb-4">
                        Type passages from classic literature and famous books while improving your skills.
                      </p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Features
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Classic literature library</li>
                            <li>• Chapter-by-chapter progression</li>
                            <li>• Multiple topics & genres</li>
                            <li>• Difficulty filtering</li>
                            <li>• Save reading progress</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Heart className="w-4 h-4 text-red-500" />
                            Popular Books
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Pride and Prejudice</li>
                            <li>• Moby Dick</li>
                            <li>• Alice in Wonderland</li>
                            <li>• Sherlock Holmes</li>
                            <li>• And many more...</li>
                          </ul>
                        </div>
                      </div>

                      <Button asChild size="sm" data-testid="button-try-book">
                        <Link href="/book-mode">
                          <BookMarked className="w-4 h-4 mr-2" />
                          Browse Books
                        </Link>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="dictation" className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-cyan-500/10">
                      <Headphones className="w-6 h-6 text-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">Dictation Mode</h3>
                      <p className="text-muted-foreground mb-4">
                        Improve listening skills and typing accuracy by typing what you hear.
                      </p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Volume2 className="w-4 h-4 text-cyan-500" />
                            Practice Modes
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Quick Practice (fast-paced)</li>
                            <li>• Focus Mode (zen experience)</li>
                            <li>• Challenge Mode (no hints)</li>
                            <li>• Adjustable speech speed</li>
                            <li>• Various difficulty levels</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            Special Features
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Zen themes (Ocean, Forest, Sunset)</li>
                            <li>• Bookmark difficult sentences</li>
                            <li>• Session history tracking</li>
                            <li>• Streak counter</li>
                            <li>• Achievement unlocks</li>
                          </ul>
                        </div>
                      </div>

                      <Button asChild size="sm" data-testid="button-try-dictation">
                        <Link href="/dictation-mode">
                          <Mic className="w-4 h-4 mr-2" />
                          Try Dictation
                        </Link>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stress" className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-red-500/10">
                      <Skull className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">Stress Test</h3>
                      <p className="text-muted-foreground mb-4">
                        Challenge yourself with extreme visual and auditory effects designed to test your focus.
                      </p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-red-500" />
                            Difficulty Levels
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Beginner (screen shake, distractions)</li>
                            <li>• Intermediate (+ blur, color shift)</li>
                            <li>• Expert (+ gravity, rotation)</li>
                            <li>• Nightmare (+ glitch, text fade)</li>
                            <li>• Impossible (+ reverse, screen flip)</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-500" />
                            Effects
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Screen shake & vibration</li>
                            <li>• Emoji particle explosions</li>
                            <li>• Chaotic sound effects</li>
                            <li>• Text blur & fading</li>
                            <li>• Screen rotation & flipping</li>
                            <li>• Anti-cheat system</li>
                          </ul>
                        </div>
                      </div>

                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Warning:</strong> Stress Test contains intense visual effects. Not recommended for users sensitive to flashing lights or motion.
                          </span>
                        </p>
                      </div>

                      <Button asChild size="sm" variant="destructive" data-testid="button-try-stress">
                        <Link href="/stress-test">
                          <Flame className="w-4 h-4 mr-2" />
                          Enter Stress Test
                        </Link>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="multiplayer" className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/10">
                      <Users className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">Multiplayer Racing</h3>
                      <p className="text-muted-foreground mb-4">
                        Compete in real-time against players worldwide or challenge friends in private rooms.
                      </p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            Race Modes
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Quick Match (instant matchmaking)</li>
                            <li>• Private Rooms (password-protected)</li>
                            <li>• Custom Rooms (create your own)</li>
                            <li>• Timed Races (30s, 60s, 120s, 180s)</li>
                            <li>• Standard Races (finish paragraph)</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            Features
                          </h4>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Real-time progress tracking</li>
                            <li>• Live chat in race rooms</li>
                            <li>• ELO rating system</li>
                            <li>• AI Ghost Racers</li>
                            <li>• Rematch functionality</li>
                            <li>• Global leaderboards</li>
                          </ul>
                        </div>
                      </div>

                      <Button asChild size="sm" data-testid="button-try-multiplayer">
                        <Link href="/multiplayer">
                          <Users className="w-4 h-4 mr-2" />
                          Join Multiplayer
                        </Link>
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.section>

        {/* Analytics Section */}
        <motion.section
          id="analytics"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="scroll-mt-24"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-cyan-500/10">
                  <BarChart3 className="w-6 h-6 text-cyan-500" />
                </div>
                <div>
                  <CardTitle className="text-3xl">Analytics & Progress Tracking</CardTitle>
                  <CardDescription>Comprehensive insights powered by AI to accelerate your improvement</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>WPM progress over time</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Accuracy trend analysis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Consistency metrics</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Historical trends (weekly/monthly)</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Fingerprint className="w-5 h-5 text-purple-500" />
                      Keystroke Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Keyboard heatmap</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Finger usage distribution</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Hand balance metrics</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Typing rhythm analysis</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-orange-500" />
                      Mistake Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Error-prone keys identification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Common substitution patterns</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Slowest words tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Targeted practice suggestions</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="w-5 h-5 text-green-500" />
                      AI-Powered Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Personalized recommendations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Skill level assessment</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Practice plan generation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Weekly improvement goals</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-yellow-500" />
                      Benchmark Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Industry standard benchmarks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Skill tier placement</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Percentile rankings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Goal setting assistance</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-pink-500" />
                      Session History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Complete test history</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Performance timeline</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Personal best tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Milestone achievements</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-lg p-6 border border-cyan-500/20">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-500" />
                  How to Use Analytics Effectively
                </h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">1.</span>
                    <span>Complete at least 10 tests to get accurate baseline metrics</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">2.</span>
                    <span>Review your Analytics page weekly to track improvements</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">3.</span>
                    <span>Use AI Insights to identify weak areas and get practice recommendations</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">4.</span>
                    <span>Focus on consistency over speed - accuracy builds muscle memory</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-primary">5.</span>
                    <span>Practice problem keys identified in your Mistake Analysis</span>
                  </li>
                </ol>
              </div>

              <Button asChild data-testid="button-view-analytics">
                <Link href="/analytics">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Your Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.section>

        {/* Achievements Section */}
        <motion.section
          id="achievements"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="scroll-mt-24"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <Trophy className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-3xl">Achievements & Gamification</CardTitle>
                  <CardDescription>Unlock badges, climb leaderboards, and celebrate milestones</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Badge Categories
                  </h3>
                  <div className="space-y-3">
                    <Card className="bg-amber-500/10 border-amber-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Zap className="w-5 h-5 text-amber-500" />
                          <h4 className="font-semibold">Speed Achievements</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Unlock badges at 30, 50, 80, 100, and 120+ WPM milestones
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-500/10 border-blue-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Target className="w-5 h-5 text-blue-500" />
                          <h4 className="font-semibold">Accuracy Achievements</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Earn badges for 95%, 98%, and 100% accuracy tests
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-orange-500/10 border-orange-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Flame className="w-5 h-5 text-orange-500" />
                          <h4 className="font-semibold">Streak Achievements</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Maintain daily practice streaks: 7, 14, 30, 60, 100+ days
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-purple-500/10 border-purple-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Star className="w-5 h-5 text-purple-500" />
                          <h4 className="font-semibold">Special & Secret Badges</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Discover hidden achievements and limited-time challenges
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    Leaderboards & Rankings
                  </h3>
                  <div className="space-y-3">
                    <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Globe className="w-5 h-5 text-yellow-500" />
                          <h4 className="font-semibold">Global Leaderboard</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Compete with typists worldwide across all standard tests
                        </p>
                        <Button asChild size="sm" variant="outline" data-testid="button-global-leaderboard">
                          <Link href="/leaderboard">View Rankings</Link>
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Code className="w-5 h-5 text-green-500" />
                          <h4 className="font-semibold">Code Leaderboard</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Language-specific rankings for code typing tests
                        </p>
                        <Button asChild size="sm" variant="outline" data-testid="button-code-leaderboard">
                          <Link href="/code-leaderboard">View Code Rankings</Link>
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Flame className="w-5 h-5 text-red-500" />
                          <h4 className="font-semibold">Stress Test Leaderboard</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Rankings for each difficulty level of stress tests
                        </p>
                        <Button asChild size="sm" variant="outline" data-testid="button-stress-leaderboard">
                          <Link href="/stress-leaderboard">View Stress Rankings</Link>
                        </Button>
                      </CardContent>
                    </Card>

                    <div className="bg-muted/50 rounded-lg p-4 border border-border">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        ELO Rating System
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Your competitive rating changes based on multiplayer race performance. Win against higher-rated players to gain more points!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 rounded-lg p-6 border border-purple-500/20">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Medal className="w-5 h-5 text-purple-500" />
                  Badge Tier System
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-700/20 mx-auto mb-2 flex items-center justify-center">
                      <Medal className="w-6 h-6 text-amber-700" />
                    </div>
                    <p className="font-semibold text-sm">Bronze</p>
                    <p className="text-xs text-muted-foreground">10-25 XP</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-400/20 mx-auto mb-2 flex items-center justify-center">
                      <Medal className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="font-semibold text-sm">Silver</p>
                    <p className="text-xs text-muted-foreground">25-50 XP</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 mx-auto mb-2 flex items-center justify-center">
                      <Medal className="w-6 h-6 text-yellow-500" />
                    </div>
                    <p className="font-semibold text-sm">Gold</p>
                    <p className="text-xs text-muted-foreground">50-100 XP</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-cyan-400/20 mx-auto mb-2 flex items-center justify-center">
                      <Medal className="w-6 h-6 text-cyan-400" />
                    </div>
                    <p className="font-semibold text-sm">Platinum</p>
                    <p className="text-xs text-muted-foreground">100-200 XP</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-400/20 mx-auto mb-2 flex items-center justify-center">
                      <Medal className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="font-semibold text-sm">Diamond</p>
                    <p className="text-xs text-muted-foreground">200+ XP</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Advanced Features Section */}
        <motion.section
          id="advanced"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="scroll-mt-24"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-3xl">Advanced Features</CardTitle>
                  <CardDescription>Power user tools and customization options</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Assistant Feature - Expanded */}
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg p-6 border border-blue-500/20 mb-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-blue-500" />
                  AI Chat Assistant - Your Personal Typing Coach
                </h3>
                <p className="text-muted-foreground mb-4">
                  Our advanced AI assistant analyzes your typing patterns and provides real-time, personalized coaching to accelerate your improvement.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-cyan-500" />
                      What It Does:
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Analyzes your test results and identifies weak areas</li>
                      <li>• Provides targeted practice exercises for problem keys</li>
                      <li>• Offers technique improvement suggestions</li>
                      <li>• Motivational feedback based on your progress</li>
                      <li>• Answers typing-related questions instantly</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      How to Use:
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Access from the Chat page in navigation</li>
                      <li>• Ask about specific keys or typing issues</li>
                      <li>• Request custom practice recommendations</li>
                      <li>• Get explanations for your analytics data</li>
                      <li>• Receive daily practice tips and motivation</li>
                    </ul>
                  </div>
                </div>
                <Button asChild size="sm" className="mt-4" data-testid="button-ai-chat">
                  <Link href="/chat">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Chat with AI Assistant
                  </Link>
                </Button>
              </div>

              {/* Certificates & Sharing - Expanded */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-6 border border-green-500/20 mb-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-green-500" />
                  Achievements Certificates & Social Sharing
                </h3>
                <p className="text-muted-foreground mb-4">
                  Celebrate your typing milestones with professional certificates and share your achievements with the world.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <Download className="w-4 h-4 text-green-500" />
                      Downloadable Certificates:
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Professional PDF certificates for achievements</li>
                      <li>• Code Mode completion certificates</li>
                      <li>• WPM milestone certificates (50, 80, 100+ WPM)</li>
                      <li>• Stress Test completion certificates</li>
                      <li>• Perfect accuracy (100%) certificates</li>
                      <li>• Customized with your name and stats</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-cyan-500" />
                      Social Sharing Options:
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Beautiful visual result cards</li>
                      <li>• Share to Twitter, Facebook, LinkedIn, WhatsApp</li>
                      <li>• Copy direct link to your result page</li>
                      <li>• Anonymous sharing option available</li>
                      <li>• Badge showcase for unlocked achievements</li>
                      <li>• Auto-generated achievement announcements</li>
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 italic">
                  💡 Tip: After completing a test, click the share icon to generate your result card or download certificate!
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-amber-500/10 border-amber-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-amber-500" />
                      Adaptive Difficulty
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Content difficulty adapts to your skill level automatically
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• AI-generated content matches your WPM</li>
                      <li>• Difficulty levels: Easy, Medium, Hard</li>
                      <li>• Automatically adjusts based on performance</li>
                      <li>• Gradual progression system</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-indigo-500/10 border-indigo-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-500" />
                      Session History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Complete history of all your typing sessions and progress
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Every test result saved permanently</li>
                      <li>• Dictation practice session logs</li>
                      <li>• Multiplayer race history</li>
                      <li>• Filter by date, mode, or performance</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-purple-500/10 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-5 h-5 text-purple-500" />
                      Customization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Personalize your typing experience with extensive settings
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Themes (Dark/Light/Custom)</li>
                      <li>• Typing sounds</li>
                      <li>• Caret styles</li>
                      <li>• Focus modes</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-orange-500/10 border-orange-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Download className="w-5 h-5 text-orange-500" />
                      PWA Support
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Install as a Progressive Web App for offline access
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Offline typing practice</li>
                      <li>• Push notifications</li>
                      <li>• Desktop integration</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-red-500/10 border-red-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-red-500" />
                      Anti-Cheat System
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Fair play enforcement with sophisticated validation
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Server-side verification</li>
                      <li>• Keystroke validation</li>
                      <li>• Pattern detection</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-cyan-500/10 border-cyan-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="w-5 h-5 text-cyan-500" />
                      Multi-Language
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Practice in 23+ languages with native content
                    </p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• Language-specific paragraphs</li>
                      <li>• Special character support</li>
                      <li>• Unicode handling</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-lg p-6 border border-indigo-500/20">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-500" />
                  Accessibility Features
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Keyboard-only navigation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Screen reader support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      High contrast themes
                    </li>
                  </ul>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Adjustable font sizes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Focus indicators
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ARIA labels
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Tips & Tricks Section */}
        <motion.section
          id="tips"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="scroll-mt-24"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Lightbulb className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <CardTitle className="text-3xl">Tips & Best Practices</CardTitle>
                  <CardDescription>Expert advice to accelerate your progress</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    For Beginners
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                      <h4 className="font-semibold mb-2">1. Focus on Accuracy First</h4>
                      <p className="text-sm text-muted-foreground">
                        Speed will come naturally once you build muscle memory. Aim for 95%+ accuracy before pushing for higher WPM.
                      </p>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                      <h4 className="font-semibold mb-2">2. Use Proper Technique</h4>
                      <p className="text-sm text-muted-foreground">
                        Keep wrists elevated, fingers curved, and use the home row position. Don't look at the keyboard.
                      </p>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                      <h4 className="font-semibold mb-2">3. Practice Daily</h4>
                      <p className="text-sm text-muted-foreground">
                        Even 10-15 minutes daily is more effective than occasional long sessions. Build a streak!
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    For Advanced Users
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                      <h4 className="font-semibold mb-2">1. Target Weak Keys</h4>
                      <p className="text-sm text-muted-foreground">
                        Use Analytics to identify error-prone keys and practice them specifically. Focus on digraphs (key combinations).
                      </p>
                    </div>
                    <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                      <h4 className="font-semibold mb-2">2. Vary Your Practice</h4>
                      <p className="text-sm text-muted-foreground">
                        Mix standard tests with Code Mode, Book Mode, and Dictation to challenge different skills.
                      </p>
                    </div>
                    <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                      <h4 className="font-semibold mb-2">3. Use Multiplayer for Motivation</h4>
                      <p className="text-sm text-muted-foreground">
                        Racing against others pushes you to type faster. Compete regularly to improve under pressure.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 rounded-lg p-6 border border-green-500/20">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Proven Improvement Strategies
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-semibold mb-2 text-sm">Technique Tips:</h5>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Maintain consistent rhythm, don't rush</li>
                      <li>• Use all fingers, not just index fingers</li>
                      <li>• Press keys lightly, don't pound</li>
                      <li>• Take breaks every 20-30 minutes</li>
                      <li>• Sit with good posture</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-2 text-sm">Mental Approach:</h5>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Read ahead of what you're typing</li>
                      <li>• Don't dwell on mistakes, keep flowing</li>
                      <li>• Practice when you're alert and focused</li>
                      <li>• Set realistic, incremental goals</li>
                      <li>• Celebrate small improvements</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 border border-border">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Recommended Practice Schedule
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">Week 1-2</Badge>
                    <p className="text-sm text-muted-foreground">
                      15 min/day standard tests. Focus on accuracy (95%+). Learn proper finger placement.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">Week 3-4</Badge>
                    <p className="text-sm text-muted-foreground">
                      20 min/day mixed practice. Add Code Mode or Book Mode. Target weak keys from analytics.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">Month 2+</Badge>
                    <p className="text-sm text-muted-foreground">
                      30 min/day varied practice. Include multiplayer races. Use AI insights for targeted improvement.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* FAQ Section */}
        <motion.section
          id="faq"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="scroll-mt-24"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-pink-500/10">
                  <HelpCircle className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                  <CardTitle className="text-3xl">Frequently Asked Questions</CardTitle>
                  <CardDescription>Common questions answered</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="faq-1">
                  <AccordionTrigger data-testid="faq-trigger-1">
                    What is a good typing speed?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-3">
                      Average typing speeds vary by skill level:
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                      <li>• <strong>Beginner:</strong> Below 30 WPM</li>
                      <li>• <strong>Developing:</strong> 30-40 WPM</li>
                      <li>• <strong>Intermediate:</strong> 40-50 WPM</li>
                      <li>• <strong>Advanced:</strong> 50-70 WPM</li>
                      <li>• <strong>Expert:</strong> 70-90 WPM</li>
                      <li>• <strong>Professional:</strong> 90+ WPM</li>
                    </ul>
                    <p className="text-muted-foreground mt-3 text-sm">
                      The average office worker types around 40 WPM. Professional typists often exceed 80 WPM with high accuracy.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-2">
                  <AccordionTrigger data-testid="faq-trigger-2">
                    How long does it take to improve typing speed?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-3">
                      Improvement timeline depends on practice consistency and starting level:
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                      <li>• With 15 minutes of daily practice, expect 5-10 WPM improvement per month</li>
                      <li>• Beginners often see faster initial progress (10-15 WPM/month)</li>
                      <li>• Advanced typists may improve 2-5 WPM per month as they approach limits</li>
                      <li>• Consistent practice over 3-6 months can dramatically improve your speed</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-3">
                  <AccordionTrigger data-testid="faq-trigger-3">
                    Do I need to create an account?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      No, you can start typing tests immediately as a guest. However, creating a free account unlocks many benefits: progress tracking, analytics, achievements, leaderboard rankings, multiplayer racing, and AI-powered insights. We recommend creating an account to get the most value from the platform.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-4">
                  <AccordionTrigger data-testid="faq-trigger-4">
                    How does the AI-powered analytics work?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-3">
                      Our AI system analyzes your typing patterns to provide personalized insights:
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                      <li>• Identifies weak keys and common mistakes</li>
                      <li>• Compares your performance to industry benchmarks</li>
                      <li>• Generates targeted practice recommendations</li>
                      <li>• Creates weekly improvement goals based on your skill level</li>
                      <li>• Tracks rhythm, consistency, and technique metrics</li>
                    </ul>
                    <p className="text-muted-foreground mt-3 text-sm">
                      Complete at least 10 tests to get accurate AI insights.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-5">
                  <AccordionTrigger data-testid="faq-trigger-5">
                    What's the difference between accuracy and raw WPM?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-3">
                      Understanding WPM metrics:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground ml-4">
                      <li>
                        <strong>WPM (Words Per Minute):</strong> Your adjusted speed after accounting for errors. This is your actual typing speed.
                      </li>
                      <li>
                        <strong>Raw WPM:</strong> Your speed without error penalties. Shows how fast you could type if you made no mistakes.
                      </li>
                      <li>
                        <strong>Accuracy:</strong> Percentage of characters typed correctly (correct characters / total characters × 100).
                      </li>
                    </ul>
                    <p className="text-muted-foreground mt-3 text-sm">
                      Focus on improving accuracy first. High accuracy leads to better WPM scores over time.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-6">
                  <AccordionTrigger data-testid="faq-trigger-6">
                    Can I practice on mobile devices?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      TypeMasterAI is optimized for physical keyboards and desktop/laptop use. While the site is mobile-responsive, touch typing on mobile devices provides a different experience and won't translate well to physical keyboard skills. We recommend practicing on a device with a physical keyboard for the best results.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-7">
                  <AccordionTrigger data-testid="faq-trigger-7">
                    How do multiplayer races work?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-3">
                      Multiplayer racing lets you compete in real-time:
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                      <li>• <strong>Quick Match:</strong> Instantly join a public race with other online players</li>
                      <li>• <strong>Private Room:</strong> Create a password-protected room to race with friends</li>
                      <li>• <strong>Custom Room:</strong> Configure duration, text source, and max players</li>
                      <li>• Races start with a countdown once all players are ready</li>
                      <li>• Your progress is shown in real-time alongside other racers</li>
                      <li>• ELO rating adjusts based on your finish position</li>
                      <li>• AI bots may join if not enough human players are available</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-8">
                  <AccordionTrigger data-testid="faq-trigger-8">
                    What is the Stress Test mode?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-3">
                      Stress Test is an extreme difficulty mode that challenges your focus and concentration:
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                      <li>• Progressive difficulty levels from Beginner to Impossible</li>
                      <li>• Visual effects like screen shake, blur, rotation, and color shifts</li>
                      <li>• Audio distractions and chaotic sound effects</li>
                      <li>• Text manipulation including fading, reversing, and random jumps</li>
                      <li>• Anti-cheat system to ensure fair play</li>
                      <li>• Separate leaderboards for each difficulty level</li>
                    </ul>
                    <p className="text-muted-foreground mt-3 text-sm font-semibold">
                      Warning: Contains intense visual effects. Not recommended for users sensitive to flashing lights or motion.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-9">
                  <AccordionTrigger data-testid="faq-trigger-9">
                    How can I share my results?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground mb-3">
                      Share your achievements in multiple ways:
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                      <li>• Generate a visual result card with your stats</li>
                      <li>• Download a professional achievement certificate</li>
                      <li>• Share directly to Twitter, Facebook, WhatsApp, or LinkedIn</li>
                      <li>• Copy a direct link to your result page</li>
                      <li>• Choose to share anonymously or with your username</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-10">
                  <AccordionTrigger data-testid="faq-trigger-10">
                    Is TypeMasterAI free to use?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">
                      Yes! TypeMasterAI is completely free to use with all features unlocked. You can create an account, take unlimited tests, access analytics, compete on leaderboards, join multiplayer races, and use all typing modes without any payment. Our mission is to help everyone improve their typing skills.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </motion.section>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center py-12"
        >
          <Card className="bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 border-primary/30">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-4">Ready to Master Your Typing?</h2>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join thousands of users improving their typing speed and accuracy every day. Start your journey now!
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button asChild size="lg" data-testid="button-cta-start">
                  <Link href="/">
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Start Typing Now
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" data-testid="button-cta-register">
                  <Link href="/register">
                    <Rocket className="w-5 h-5 mr-2" />
                    Create Free Account
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
