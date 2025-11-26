import { Link } from 'wouter';
import { Clock, Zap, Target, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { useSEO } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function TypingTest3MinPage() {
  useSEO({
    title: '3 Minute Typing Test | Free 180 Second WPM Speed Test - TypeMasterAI',
    description: 'Take a comprehensive 3-minute typing speed test for accurate WPM measurement. Perfect for intermediate typists seeking reliable results. Get detailed performance analytics and progress tracking. Start your free 3-minute typing test now!',
    keywords: '3 minute typing test, 180 second typing test, typing test 3 min, three minute typing speed test, typing speed test 3 minutes, intermediate typing test',
    canonical: 'https://typemaster-ai.replit.app/3-minute-typing-test',
    ogUrl: 'https://typemaster-ai.replit.app/3-minute-typing-test',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Take a 3 Minute Typing Test',
      description: 'Complete a comprehensive typing speed test in 3 minutes for accurate WPM measurement',
      step: [
        {
          '@type': 'HowToStep',
          name: 'Prepare Your Workspace',
          text: 'Sit comfortably with proper posture, position fingers on home row keys',
          position: 1,
        },
        {
          '@type': 'HowToStep',
          name: 'Start the Test',
          text: 'Click Start Test and begin typing the displayed paragraph for 3 minutes',
          position: 2,
        },
        {
          '@type': 'HowToStep',
          name: 'Maintain Consistency',
          text: 'Type steadily for the full 3 minutes to get an accurate average WPM',
          position: 3,
        },
        {
          '@type': 'HowToStep',
          name: 'Review Results',
          text: 'Analyze your WPM, accuracy, keystroke heatmap, and improvement recommendations',
          position: 4,
        },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 pt-20 pb-16">
        <Breadcrumbs items={[{ label: '3 Minute Typing Test', href: '/3-minute-typing-test' }]} />

        {/* Hero Section */}
        <section className="max-w-4xl mx-auto text-center pt-8 pb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-cyan-400 mb-6">
            3 Minute Typing Test
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8">
            The gold standard for accurate typing speed measurement
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/test">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-8 py-6" data-testid="button-start-3min-test">
                <Clock className="mr-2 h-5 w-5" />
                Start 3 Minute Test
              </Button>
            </Link>
            <Link href="/multiplayer">
              <Button size="lg" variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 text-lg px-8 py-6" data-testid="button-multiplayer-race">
                Multiplayer Race
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="max-w-6xl mx-auto py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
            Why Take a 3 Minute Typing Test?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Target className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Most Accurate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  3 minutes is the industry standard for typing tests. Long enough to eliminate variance, short enough to maintain focus.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Consistent Results</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Longer tests smooth out speed fluctuations, giving you a reliable average WPM that represents your true skill level.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Clock className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Build Stamina</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Train your endurance for longer typing sessions. Essential for professional work that requires sustained typing speed.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Award className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Professional Standard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Many employers use 3-minute tests for job assessments. Practice with the same duration to prepare for real evaluations.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="max-w-4xl mx-auto py-16">
          <article className="prose prose-invert prose-cyan max-w-none">
            <h2 className="text-3xl font-bold text-white">What is a 3 Minute Typing Test?</h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              A <strong>3 minute typing test</strong> is widely considered the most accurate way to measure your true typing ability. In 180 seconds, you'll type a paragraph while the system tracks your <strong>words per minute (WPM)</strong> and accuracy percentage. This duration provides enough time to establish a consistent rhythm while being short enough to maintain concentration.
            </p>

            <h3 className="text-2xl font-bold text-white mt-8">Professional Typing Speed Benchmarks</h3>
            <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
              <li><strong>Entry Level:</strong> 30-40 WPM - Minimum for most office jobs</li>
              <li><strong>Intermediate:</strong> 40-60 WPM - Comfortable for general computer work</li>
              <li><strong>Advanced:</strong> 60-80 WPM - Competitive typing proficiency</li>
              <li><strong>Expert:</strong> 80-100 WPM - Professional typist level</li>
              <li><strong>Elite:</strong> 100+ WPM - Top 1% of typists worldwide</li>
            </ul>

            <h3 className="text-2xl font-bold text-white mt-8">Why 3 Minutes is the Gold Standard</h3>
            <p className="text-lg text-slate-300 leading-relaxed">
              The <strong>3-minute duration</strong> has become the industry standard for several important reasons:
            </p>
            <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
              <li><strong>Statistical reliability</strong> - Enough time to average out brief speed bursts or slowdowns</li>
              <li><strong>Reduced test anxiety</strong> - Less pressure than 1-minute sprint tests</li>
              <li><strong>Real-world simulation</strong> - Matches typical work typing scenarios</li>
              <li><strong>Stamina assessment</strong> - Reveals your sustained typing ability, not just peak speed</li>
              <li><strong>Employment standard</strong> - Most companies use 3-5 minute tests for hiring</li>
            </ul>

            <h3 className="text-2xl font-bold text-white mt-8">How to Maximize Your 3 Minute Test Score</h3>
            <ol className="list-decimal list-inside space-y-3 text-lg text-slate-300">
              <li><strong>Warm up first</strong> - Take a 1-minute practice test before your scored attempt</li>
              <li><strong>Maintain steady pace</strong> - Don't sprint at the start; consistency wins</li>
              <li><strong>Focus on accuracy</strong> - One error can cost you 5-10 WPM in overall score</li>
              <li><strong>Use proper technique</strong> - Touch typing with home row finger placement</li>
              <li><strong>Minimize corrections</strong> - Backspacing wastes valuable time</li>
              <li><strong>Stay relaxed</strong> - Tension reduces speed and increases errors</li>
              <li><strong>Practice regularly</strong> - Take tests at the same time daily for best results</li>
            </ol>

            <h3 className="text-2xl font-bold text-white mt-8">1 Minute vs 3 Minute vs 5 Minute Tests</h3>
            <div className="overflow-x-auto my-6">
              <table className="w-full border-collapse bg-slate-800/50 rounded-lg overflow-hidden">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="p-4 text-left text-white font-semibold border-b border-slate-700">Duration</th>
                    <th className="p-4 text-left text-white font-semibold border-b border-slate-700">Best For</th>
                    <th className="p-4 text-left text-white font-semibold border-b border-slate-700">Accuracy</th>
                    <th className="p-4 text-left text-white font-semibold border-b border-slate-700">Use Case</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr>
                    <td className="p-4 border-b border-slate-700">1 Minute</td>
                    <td className="p-4 border-b border-slate-700">Quick checks, warm-ups</td>
                    <td className="p-4 border-b border-slate-700">Moderate variance</td>
                    <td className="p-4 border-b border-slate-700">Daily practice, speed bursts</td>
                  </tr>
                  <tr className="bg-cyan-900/10">
                    <td className="p-4 border-b border-slate-700 font-semibold text-cyan-400">3 Minutes</td>
                    <td className="p-4 border-b border-slate-700">Accurate measurement</td>
                    <td className="p-4 border-b border-slate-700">Most consistent</td>
                    <td className="p-4 border-b border-slate-700">Job tests, certifications</td>
                  </tr>
                  <tr>
                    <td className="p-4">5 Minutes</td>
                    <td className="p-4">Endurance training</td>
                    <td className="p-4">Very stable</td>
                    <td className="p-4">Professional evaluation</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-2xl font-bold text-white mt-8">Features of Our 3 Minute Typing Test</h3>
            <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
              <li>✨ <strong>Real-time WPM display</strong> - Track your speed throughout the test</li>
              <li>📊 <strong>Advanced analytics</strong> - Keystroke heatmaps, finger usage, consistency charts</li>
              <li>🎯 <strong>Accuracy tracking</strong> - See errors in real-time with highlighted mistakes</li>
              <li>🧠 <strong>AI-powered insights</strong> - Get personalized recommendations after each test</li>
              <li>🌍 <strong>23+ languages</strong> - Practice in English, Spanish, French, and more</li>
              <li>🏆 <strong>Global leaderboards</strong> - Compare your results with typists worldwide</li>
              <li>💯 <strong>No signup required</strong> - Start testing immediately, save results optionally</li>
            </ul>

            <div className="bg-slate-800/50 border-l-4 border-cyan-500 p-6 my-8">
              <h4 className="text-xl font-bold text-cyan-400 mb-2">Expert Tip</h4>
              <p className="text-slate-300">
                For the most representative score, take 3-5 consecutive 3-minute tests and average the results. This eliminates outliers and gives you a true baseline of your typing ability.
              </p>
            </div>

            <h3 className="text-2xl font-bold text-white mt-8">Frequently Asked Questions</h3>
            
            <h4 className="text-xl font-semibold text-cyan-400 mt-6">Is 3 minutes too long for a typing test?</h4>
            <p className="text-lg text-slate-300">
              No! 3 minutes is actually the sweet spot - long enough for accurate measurement but short enough to maintain focus. It's the standard used by employers and typing certification programs.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">What's a good WPM for a 3-minute test?</h4>
            <p className="text-lg text-slate-300">
              For general computer use, 40-50 WPM is average. Office professionals typically score 60-80 WPM. Anything above 80 WPM is considered excellent, and 100+ WPM places you in the expert category.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">Should I aim for speed or accuracy?</h4>
            <p className="text-lg text-slate-300">
              Accuracy first! A 3-minute test rewards consistency. It's better to type at 70 WPM with 98% accuracy than 90 WPM with 85% accuracy. Master accuracy first, then gradually increase speed.
            </p>

            <div className="text-center mt-12">
              <Link href="/test">
                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-12 py-6" data-testid="button-start-test-bottom">
                  <Clock className="mr-2 h-6 w-6" />
                  Start Your Free 3 Minute Test Now
                </Button>
              </Link>
            </div>
          </article>
        </section>

        {/* Related Tests */}
        <section className="max-w-6xl mx-auto py-16">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Try Other Test Durations</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/1-minute-typing-test">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-1min-test">
                <CardHeader>
                  <CardTitle className="text-white">1 Minute Test</CardTitle>
                  <CardDescription className="text-slate-400">
                    Quick speed check, perfect for warm-ups and daily practice
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/test">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-standard-test">
                <CardHeader>
                  <CardTitle className="text-white">Custom Duration</CardTitle>
                  <CardDescription className="text-slate-400">
                    Choose 15s, 30s, 60s, 2min, or 5min for flexible practice
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
          </div>
        </section>
      </div>
    </div>
  );
}
