import { useEffect } from 'react';
import { Link } from 'wouter';
import { Timer, Zap, Target, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { useSEO } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TypingTest1MinPage() {
  useSEO({
    title: '1 Minute Typing Test | Free 60 Second WPM Speed Test - TypeMasterAI',
    description: 'Take a quick 1-minute typing speed test and measure your WPM instantly. Perfect for beginners and quick practice sessions. Get real-time accuracy tracking and instant results. Start your free 60-second typing test now!',
    keywords: '1 minute typing test, 60 second typing test, quick typing test, typing test 1 min, one minute typing speed test, fast typing test, typing speed 60 seconds',
    canonical: 'https://typemaster-ai.replit.app/1-minute-typing-test',
    ogUrl: 'https://typemaster-ai.replit.app/1-minute-typing-test',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Take a 1 Minute Typing Test',
      description: 'Complete a typing speed test in just 60 seconds and get your WPM results',
      step: [
        {
          '@type': 'HowToStep',
          name: 'Start the Test',
          text: 'Click the Start Test button below to begin your 1-minute typing challenge',
          position: 1,
        },
        {
          '@type': 'HowToStep',
          name: 'Type the Text',
          text: 'Type the displayed paragraph as quickly and accurately as possible for 60 seconds',
          position: 2,
        },
        {
          '@type': 'HowToStep',
          name: 'View Your Results',
          text: 'Get instant WPM, accuracy percentage, and detailed performance analytics',
          position: 3,
        },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-cyan-400 mb-6">
            1 Minute Typing Test
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8">
            Quick & accurate typing speed measurement in just 60 seconds
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/test">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-8 py-6" data-testid="button-start-1min-test">
                <Zap className="mr-2 h-5 w-5" />
                Start 1 Minute Test
              </Button>
            </Link>
            <Link href="/multiplayer">
              <Button size="lg" variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 text-lg px-8 py-6" data-testid="button-multiplayer-race">
                Multiplayer Race
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
            Why Choose a 1 Minute Typing Test?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Timer className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Quick Results</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Get your WPM score in just 60 seconds. Perfect for quick practice sessions or warm-ups.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Target className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">High Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Real-time accuracy tracking ensures you get precise measurements of your typing performance.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Track Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Save your results and monitor improvement over time with detailed analytics and charts.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Award className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Free Forever</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Unlimited tests, no signup required. Start testing your typing speed immediately.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto prose prose-invert prose-cyan">
          <article className="text-slate-300 space-y-6">
            <h2 className="text-3xl font-bold text-white">What is a 1 Minute Typing Test?</h2>
            <p className="text-lg leading-relaxed">
              A <strong>1 minute typing test</strong> is a quick and efficient way to measure your typing speed and accuracy. In just 60 seconds, you'll type a displayed paragraph while the system calculates your <strong>words per minute (WPM)</strong> and accuracy percentage in real-time.
            </p>

            <h3 className="text-2xl font-bold text-white mt-8">Average Typing Speed Benchmarks</h3>
            <ul className="list-disc list-inside space-y-2 text-lg">
              <li><strong>Beginner:</strong> 20-30 WPM - Just starting to learn touch typing</li>
              <li><strong>Average:</strong> 40-50 WPM - Typical for most computer users</li>
              <li><strong>Above Average:</strong> 60-80 WPM - Good typing proficiency</li>
              <li><strong>Professional:</strong> 80-100 WPM - Office workers and writers</li>
              <li><strong>Expert:</strong> 100+ WPM - Professional typists and court reporters</li>
            </ul>

            <h3 className="text-2xl font-bold text-white mt-8">How to Improve Your 1 Minute Test Score</h3>
            <ol className="list-decimal list-inside space-y-3 text-lg">
              <li><strong>Practice regularly</strong> - Take the test daily to build muscle memory</li>
              <li><strong>Focus on accuracy first</strong> - Speed naturally improves with correct technique</li>
              <li><strong>Use proper finger placement</strong> - Learn touch typing home row positions</li>
              <li><strong>Minimize errors</strong> - Backspacing wastes valuable time in a 1-minute test</li>
              <li><strong>Stay relaxed</strong> - Tension slows you down; maintain a comfortable posture</li>
              <li><strong>Track your progress</strong> - Monitor improvements over time to stay motivated</li>
            </ol>

            <h3 className="text-2xl font-bold text-white mt-8">Why 1 Minute vs Longer Tests?</h3>
            <p className="text-lg leading-relaxed">
              The <strong>1-minute format</strong> is perfect for quick assessments and frequent practice. It provides:
            </p>
            <ul className="list-disc list-inside space-y-2 text-lg">
              <li>Instant feedback on your current typing ability</li>
              <li>Lower fatigue compared to 3 or 5-minute tests</li>
              <li>Easy to fit into busy schedules</li>
              <li>Great for warm-ups before longer typing sessions</li>
              <li>Multiple attempts possible in one sitting</li>
            </ul>

            <h3 className="text-2xl font-bold text-white mt-8">Features of Our 1 Minute Typing Test</h3>
            <ul className="list-disc list-inside space-y-2 text-lg">
              <li>✨ <strong>AI-generated content</strong> - Fresh paragraphs every time</li>
              <li>📊 <strong>Real-time WPM tracking</strong> - Watch your speed live</li>
              <li>🎯 <strong>Accuracy percentage</strong> - See your error rate instantly</li>
              <li>📈 <strong>Detailed analytics</strong> - Keystroke heatmaps and finger usage stats</li>
              <li>🌍 <strong>23+ languages</strong> - Practice in your native language</li>
              <li>🏆 <strong>Leaderboards</strong> - Compete with typists worldwide</li>
              <li>💯 <strong>No signup required</strong> - Start testing immediately</li>
            </ul>

            <div className="bg-slate-800/50 border-l-4 border-cyan-500 p-6 my-8">
              <h4 className="text-xl font-bold text-cyan-400 mb-2">Pro Tip</h4>
              <p className="text-slate-300">
                For the most accurate results, ensure you're in a quiet environment with minimal distractions. Position your fingers on the home row (ASDF JKL;) before starting the test.
              </p>
            </div>

            <h3 className="text-2xl font-bold text-white mt-8">Frequently Asked Questions</h3>
            
            <h4 className="text-xl font-semibold text-cyan-400 mt-6">Is a 1-minute test accurate?</h4>
            <p className="text-lg">
              Yes! While longer tests can provide more stable averages, a 1-minute test gives you a reliable snapshot of your current typing ability. Take multiple tests for the most consistent results.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">How many words are in a 1-minute test?</h4>
            <p className="text-lg">
              The number of words varies based on your typing speed. At 40 WPM (average), you'll type about 40 words. Faster typists (80+ WPM) will type 80+ words in the same minute.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">Can I retake the test immediately?</h4>
            <p className="text-lg">
              Absolutely! You can take unlimited 1-minute typing tests. We recommend taking at least 3 tests and averaging the results for the most accurate measure of your true typing speed.
            </p>

            <div className="text-center mt-12">
              <Link href="/test">
                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-12 py-6" data-testid="button-start-test-bottom">
                  <Zap className="mr-2 h-6 w-6" />
                  Start Your Free 1 Minute Test Now
                </Button>
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Internal Links Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Explore More Typing Tests</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/test">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-standard-test">
                <CardHeader>
                  <CardTitle className="text-white">Standard Typing Test</CardTitle>
                  <CardDescription className="text-slate-400">
                    Choose your duration: 15s, 30s, 60s, 2min, or 5min
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/code-test">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-code-test">
                <CardHeader>
                  <CardTitle className="text-white">Code Typing Test</CardTitle>
                  <CardDescription className="text-slate-400">
                    Practice typing code in 10+ programming languages
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/multiplayer">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-multiplayer">
                <CardHeader>
                  <CardTitle className="text-white">Multiplayer Race</CardTitle>
                  <CardDescription className="text-slate-400">
                    Compete against other typists in real-time
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
