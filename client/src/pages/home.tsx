import TypingTest from "@/components/typing-test";
import generatedImage from '@assets/generated_images/subtle_dark_geometric_pattern_background_for_typing_app.png';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, GraduationCap, Users, Zap } from 'lucide-react';

export default function Home() {
  return (
      <div className="relative">
         {/* Ambient Background */}
        <div className="fixed inset-0 z-[-1] opacity-20 pointer-events-none">
           <img src={generatedImage} alt="" className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
        </div>

        <div className="flex flex-col items-center gap-4 mb-12">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/40">
            Master the Flow
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl text-center">
            Test your typing speed, track your progress, and compete with others in a distraction-free environment.
          </p>
        </div>

        <TypingTest />

        {/* Competitor Comparison Hub */}
        <section className="max-w-6xl mx-auto mt-24 mb-16 px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Best Alternative to Popular Typing Tests
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Looking for an alternative to Monkeytype, Typeracer, 10FastFingers, or Typing.com? 
              See why thousands of users are switching to TypeMasterAI for superior features and analytics.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/monkeytype-alternative">
              <Card className="bg-card/50 border-border hover:border-cyan-500 transition-all duration-300 cursor-pointer group h-full" data-testid="card-monkeytype-hub">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground">
                    <div className="flex items-center">
                      <Zap className="mr-2 h-5 w-5 text-cyan-400" />
                      <span>Monkeytype</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Everything Monkeytype has, plus AI analytics and multiplayer racing
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/typeracer-alternative">
              <Card className="bg-card/50 border-border hover:border-cyan-500 transition-all duration-300 cursor-pointer group h-full" data-testid="card-typeracer-hub">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground">
                    <div className="flex items-center">
                      <Users className="mr-2 h-5 w-5 text-cyan-400" />
                      <span>Typeracer</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Multiplayer racing with instant matchmaking and advanced analytics
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/10fastfingers-alternative">
              <Card className="bg-card/50 border-border hover:border-cyan-500 transition-all duration-300 cursor-pointer group h-full" data-testid="card-10fastfingers-hub">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground">
                    <div className="flex items-center">
                      <Zap className="mr-2 h-5 w-5 text-cyan-400" />
                      <span>10FastFingers</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    All the features you love, with AI-powered insights
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/typingcom-alternative">
              <Card className="bg-card/50 border-border hover:border-cyan-500 transition-all duration-300 cursor-pointer group h-full" data-testid="card-typingcom-hub">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground">
                    <div className="flex items-center">
                      <GraduationCap className="mr-2 h-5 w-5 text-cyan-400" />
                      <span>Typing.com</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    100% free forever with premium features included
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Join thousands who've already switched to TypeMasterAI for better typing analytics and faster improvement
            </p>
          </div>
        </section>
      </div>
  );
}
