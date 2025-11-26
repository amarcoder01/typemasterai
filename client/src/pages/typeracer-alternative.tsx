import { Link } from 'wouter';
import { Check, X, Zap, Trophy, Users, Target, Brain, Code, TrendingUp } from 'lucide-react';
import { useSEO } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function TyperacerAlternativePage() {
  useSEO({
    title: 'Typeracer Alternative | TypeMasterAI - Best Free Typing Race Game',
    description: 'Looking for a Typeracer alternative? TypeMasterAI offers multiplayer typing races, AI analytics, code typing mode, and instant matchmaking. Try the best free typing race game with advanced features Typeracer doesn\'t have!',
    keywords: 'typeracer alternative, typing race game, multiplayer typing test, typeracer competitor, better than typeracer, typing race online, free typing game',
    canonical: 'https://typemaster-ai.replit.app/typeracer-alternative',
    ogUrl: 'https://typemaster-ai.replit.app/typeracer-alternative',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 pt-20 pb-16">
        <Breadcrumbs items={[{ label: 'Typeracer Alternative', href: '/typeracer-alternative' }]} />
        
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto text-center pt-8 pb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-cyan-400 mb-6">
            The Modern Typeracer Alternative
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-4">
            Multiplayer typing races with AI-powered analytics and instant matchmaking
          </p>
          <p className="text-lg text-slate-400 mb-8">
            Everything Typeracer offers, plus advanced features for serious typists
          </p>
          <Link href="/multiplayer">
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-12 py-6" data-testid="button-start-race">
              <Trophy className="mr-2 h-6 w-6" />
              Start Racing Now - Free, No Signup
            </Button>
          </Link>
        </section>

        {/* Comparison Table */}
        <section className="max-w-6xl mx-auto py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
            TypeMasterAI vs Typeracer - Complete Comparison
          </h2>
          
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="text-left p-6 text-white font-semibold">Feature</th>
                  <th className="text-center p-6 text-cyan-400 font-semibold">TypeMasterAI</th>
                  <th className="text-center p-6 text-slate-400 font-semibold">Typeracer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr>
                  <td className="p-6 text-white">Multiplayer Racing</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-green-500 mx-auto" /></td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="bg-slate-800/30">
                  <td className="p-6 text-white">Free to Play</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-green-500 mx-auto" /></td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-6 text-white">Real-time WPM Tracking</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-green-500 mx-auto" /></td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="bg-cyan-900/20 border-l-4 border-cyan-500">
                  <td className="p-6 text-white font-semibold">Instant Matchmaking (No Waiting)</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-cyan-400 mx-auto" /></td>
                  <td className="text-center p-6"><X className="h-6 w-6 text-red-500 mx-auto" /></td>
                </tr>
                <tr className="bg-cyan-900/20 border-l-4 border-cyan-500">
                  <td className="p-6 text-white font-semibold">AI-Powered Analytics</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-cyan-400 mx-auto" /></td>
                  <td className="text-center p-6"><X className="h-6 w-6 text-red-500 mx-auto" /></td>
                </tr>
                <tr className="bg-cyan-900/20 border-l-4 border-cyan-500">
                  <td className="p-6 text-white font-semibold">Keystroke Heatmap</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-cyan-400 mx-auto" /></td>
                  <td className="text-center p-6"><X className="h-6 w-6 text-red-500 mx-auto" /></td>
                </tr>
                <tr className="bg-cyan-900/20 border-l-4 border-cyan-500">
                  <td className="p-6 text-white font-semibold">Code Typing Mode</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-cyan-400 mx-auto" /></td>
                  <td className="text-center p-6"><X className="h-6 w-6 text-red-500 mx-auto" /></td>
                </tr>
                <tr className="bg-cyan-900/20 border-l-4 border-cyan-500">
                  <td className="p-6 text-white font-semibold">Private Race Rooms</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-cyan-400 mx-auto" /></td>
                  <td className="text-center p-6"><X className="h-6 w-6 text-red-500 mx-auto" /></td>
                </tr>
                <tr className="bg-cyan-900/20 border-l-4 border-cyan-500">
                  <td className="p-6 text-white font-semibold">Finger Usage Analytics</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-cyan-400 mx-auto" /></td>
                  <td className="text-center p-6"><X className="h-6 w-6 text-red-500 mx-auto" /></td>
                </tr>
                <tr className="bg-cyan-900/20 border-l-4 border-cyan-500">
                  <td className="p-6 text-white font-semibold">AI Practice Recommendations</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-cyan-400 mx-auto" /></td>
                  <td className="text-center p-6"><X className="h-6 w-6 text-red-500 mx-auto" /></td>
                </tr>
                <tr className="bg-cyan-900/20 border-l-4 border-cyan-500">
                  <td className="p-6 text-white font-semibold">Modern UI/UX Design</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-cyan-400 mx-auto" /></td>
                  <td className="text-center p-6 text-slate-400">Dated</td>
                </tr>
                <tr className="bg-cyan-900/20 border-l-4 border-cyan-500">
                  <td className="p-6 text-white font-semibold">No Ads</td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-cyan-400 mx-auto" /></td>
                  <td className="text-center p-6"><X className="h-6 w-6 text-red-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-6 text-white">Car Customization</td>
                  <td className="text-center p-6"><X className="h-6 w-6 text-red-500 mx-auto" /></td>
                  <td className="text-center p-6"><Check className="h-6 w-6 text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Why Switch from Typeracer */}
        <section className="max-w-6xl mx-auto py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
            Why TypeMasterAI is Better Than Typeracer
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Zap className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Instant Matchmaking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  No waiting in lobbies! Our AI bot racers fill rooms instantly so you can start racing immediately. Typeracer makes you wait for other players.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Brain className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">AI-Powered Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Get personalized recommendations based on your typing patterns. Our AI analyzes your weaknesses and suggests targeted practice - something Typeracer doesn't offer.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Code className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Code Typing Races</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Practice typing in JavaScript, Python, Java, and more. Perfect for developers who want to improve coding speed - a feature Typeracer completely lacks.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Target className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Keystroke heatmaps, finger usage charts, consistency scores, and WPM trends. Get professional-grade analytics that Typeracer's basic stats can't match.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Users className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Private Race Rooms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Create private rooms and race with friends using a simple room code. Challenge specific people without dealing with random public lobbies.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Modern Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Clean, responsive design with no ads or distractions. Built with modern web technologies for smooth performance on all devices.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SEO Content */}
        <section className="max-w-4xl mx-auto py-16">
          <article className="prose prose-invert prose-cyan max-w-none">
            <h2 className="text-3xl font-bold text-white">Is TypeMasterAI a Good Typeracer Alternative?</h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              Yes! <strong>TypeMasterAI</strong> is designed specifically as a modern alternative to Typeracer, offering all the competitive multiplayer racing features you love, plus advanced analytics and features that Typeracer doesn't provide. If you enjoy Typeracer but want more in-depth performance tracking, instant matchmaking, and AI-powered improvement suggestions, TypeMasterAI is the perfect upgrade.
            </p>

            <h3 className="text-2xl font-bold text-white mt-8">What Makes Typeracer Special?</h3>
            <p className="text-lg text-slate-300 leading-relaxed">
              Typeracer pioneered the multiplayer typing race concept back in 2008. The car racing theme and competitive element make typing practice fun and engaging. However, after 15+ years, Typeracer's interface feels dated, and it lacks modern features that today's typists expect.
            </p>

            <h3 className="text-2xl font-bold text-white mt-8">Key Problems with Typeracer</h3>
            <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
              <li><strong>Long wait times</strong> - Often stuck in lobbies waiting for other players</li>
              <li><strong>Intrusive ads</strong> - Free version has distracting advertisements</li>
              <li><strong>Limited analytics</strong> - Only basic WPM and accuracy stats</li>
              <li><strong>Outdated interface</strong> - UI hasn't been modernized significantly</li>
              <li><strong>No AI insights</strong> - Doesn't tell you how to improve</li>
              <li><strong>Text-only</strong> - No code typing practice for developers</li>
              <li><strong>Basic progress tracking</strong> - Limited historical data visualization</li>
            </ul>

            <h3 className="text-2xl font-bold text-white mt-8">How TypeMasterAI Solves These Issues</h3>
            
            <h4 className="text-xl font-semibold text-cyan-400 mt-6">1. Instant Matchmaking with AI Bots</h4>
            <p className="text-lg text-slate-300">
              Our intelligent bot system fills race rooms automatically, so you never wait. Bots have realistic skill levels (35-130 WPM) and typing patterns that mimic real players. Start racing in seconds, not minutes.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">2. Zero Ads, Ever</h4>
            <p className="text-lg text-slate-300">
              TypeMasterAI is completely ad-free. No distractions, no interruptions, just pure typing competition. We believe in providing a premium experience without paywalls.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">3. Professional-Grade Analytics</h4>
            <p className="text-lg text-slate-300">
              Go beyond basic stats with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
              <li>Keystroke heatmaps showing which keys you use most</li>
              <li>Finger usage distribution to identify imbalances</li>
              <li>WPM consistency charts tracking speed fluctuations</li>
              <li>Slowest words and digraph analysis</li>
              <li>Hand balance metrics (left vs right)</li>
            </ul>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">4. AI-Powered Improvement Plan</h4>
            <p className="text-lg text-slate-300">
              Our AI analyzes your typing patterns and generates personalized practice exercises targeting your specific weaknesses. Get actionable recommendations, not just numbers.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">5. Code Typing Mode for Developers</h4>
            <p className="text-lg text-slate-300">
              Practice typing in JavaScript, Python, Java, C++, Go, Rust, and more. Build muscle memory for programming syntax, something completely absent from Typeracer.
            </p>

            <h3 className="text-2xl font-bold text-white mt-8">Typeracer vs TypeMasterAI: User Experience</h3>
            <div className="overflow-x-auto my-6">
              <table className="w-full border-collapse bg-slate-800/50 rounded-lg overflow-hidden">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="p-4 text-left text-white font-semibold border-b border-slate-700">Aspect</th>
                    <th className="p-4 text-left text-white font-semibold border-b border-slate-700">TypeMasterAI</th>
                    <th className="p-4 text-left text-white font-semibold border-b border-slate-700">Typeracer</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr>
                    <td className="p-4 border-b border-slate-700 font-semibold">Wait Time</td>
                    <td className="p-4 border-b border-slate-700">Instant (AI bots)</td>
                    <td className="p-4 border-b border-slate-700">Variable (need players)</td>
                  </tr>
                  <tr className="bg-slate-800/30">
                    <td className="p-4 border-b border-slate-700 font-semibold">Interface</td>
                    <td className="p-4 border-b border-slate-700">Modern, clean, responsive</td>
                    <td className="p-4 border-b border-slate-700">Dated, cluttered</td>
                  </tr>
                  <tr>
                    <td className="p-4 border-b border-slate-700 font-semibold">Monetization</td>
                    <td className="p-4 border-b border-slate-700">Free, no ads</td>
                    <td className="p-4 border-b border-slate-700">Ads or premium</td>
                  </tr>
                  <tr className="bg-slate-800/30">
                    <td className="p-4 border-b border-slate-700 font-semibold">Analytics Depth</td>
                    <td className="p-4 border-b border-slate-700">Advanced (heatmaps, AI insights)</td>
                    <td className="p-4 border-b border-slate-700">Basic (WPM, accuracy)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold">Mobile Experience</td>
                    <td className="p-4">Fully responsive</td>
                    <td className="p-4">Desktop-focused</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-2xl font-bold text-white mt-8">Who Should Use TypeMasterAI Instead of Typeracer?</h3>
            <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
              <li><strong>Serious typists</strong> who want detailed analytics to improve faster</li>
              <li><strong>Developers</strong> who need to practice typing code, not just prose</li>
              <li><strong>Impatient racers</strong> tired of waiting in Typeracer lobbies</li>
              <li><strong>Data enthusiasts</strong> who love tracking progress with charts and heatmaps</li>
              <li><strong>Ad-averse users</strong> who want distraction-free practice</li>
              <li><strong>Mobile typists</strong> who need a responsive interface</li>
            </ul>

            <div className="bg-slate-800/50 border-l-4 border-cyan-500 p-6 my-8">
              <h4 className="text-xl font-bold text-cyan-400 mb-2">Try Both!</h4>
              <p className="text-slate-300">
                TypeMasterAI is free and requires no signup. Try a few races and compare the experience yourself. Many Typeracer veterans switch to TypeMasterAI for the instant matchmaking alone!
              </p>
            </div>

            <h3 className="text-2xl font-bold text-white mt-8">Frequently Asked Questions</h3>
            
            <h4 className="text-xl font-semibold text-cyan-400 mt-6">Can I race against real players on TypeMasterAI?</h4>
            <p className="text-lg text-slate-300">
              Yes! While our AI bots ensure instant matchmaking, real players join public races all the time. You'll see a mix of humans and bots, creating a balanced competitive experience.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">Is TypeMasterAI completely free like Typeracer?</h4>
            <p className="text-lg text-slate-300">
              Yes, and we have no ads! All features including multiplayer racing, AI analytics, code typing mode, and advanced stats are completely free. No paywalls, no premium tiers.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">Do I need an account to race?</h4>
            <p className="text-lg text-slate-300">
              No! You can race as a guest immediately. However, creating a free account lets you save your progress, earn achievements, and access personalized analytics.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">What happened to the car theme from Typeracer?</h4>
            <p className="text-lg text-slate-300">
              TypeMasterAI focuses on clean, distraction-free racing with real-time WPM visualization. While we don't have car customization, our interface provides clearer feedback on typing performance.
            </p>

            <div className="text-center mt-12">
              <Link href="/multiplayer">
                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-12 py-6" data-testid="button-start-race-bottom">
                  <Trophy className="mr-2 h-6 w-6" />
                  Try the Best Typeracer Alternative Now
                </Button>
              </Link>
            </div>
          </article>
        </section>

        {/* Related Pages */}
        <section className="max-w-6xl mx-auto py-16">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Compare More Typing Test Platforms</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/monkeytype-alternative">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-monkeytype">
                <CardHeader>
                  <CardTitle className="text-white">Monkeytype Alternative</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">
                    See how TypeMasterAI compares to Monkeytype's minimalist approach
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/10fastfingers-alternative">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-10fastfingers">
                <CardHeader>
                  <CardTitle className="text-white">10FastFingers Alternative</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">
                    Compare our features to 10FastFingers' word-based tests
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/typingcom-alternative">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-typingcom">
                <CardHeader>
                  <CardTitle className="text-white">Typing.com Alternative</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">
                    100% free with premium features included
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
