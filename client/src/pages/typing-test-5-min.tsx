import { Link } from 'wouter';
import { Timer, Zap, Target, TrendingUp, Award, ArrowRight, Brain } from 'lucide-react';
import { useSEO } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/breadcrumbs';

export default function TypingTest5MinPage() {
  useSEO({
    title: '5 Minute Typing Test | Free 300 Second WPM Endurance Test - TypeMasterAI',
    description: 'Take a professional 5-minute typing speed test for maximum accuracy. Perfect for advanced typists and job assessments. Get comprehensive performance analytics and stamina evaluation. Start your free 5-minute typing test now!',
    keywords: '5 minute typing test, 300 second typing test, typing test 5 min, five minute typing speed test, typing endurance test, professional typing test',
    canonical: 'https://typemaster-ai.replit.app/5-minute-typing-test',
    ogUrl: 'https://typemaster-ai.replit.app/5-minute-typing-test',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Complete a 5 Minute Professional Typing Test',
      description: 'Master the professional-grade 5-minute typing test for job applications and certification',
      step: [
        {
          '@type': 'HowToStep',
          name: 'Set Up Your Environment',
          text: 'Ensure quiet workspace, comfortable seating, proper keyboard positioning',
          position: 1,
        },
        {
          '@type': 'HowToStep',
          name: 'Warm Up',
          text: 'Take a 1-minute practice test to activate muscle memory before the main test',
          position: 2,
        },
        {
          '@type': 'HowToStep',
          name: 'Start the Test',
          text: 'Begin typing and maintain steady pace throughout the full 5 minutes',
          position: 3,
        },
        {
          '@type': 'HowToStep',
          name: 'Monitor Progress',
          text: 'Watch real-time WPM and accuracy feedback to adjust your speed',
          position: 4,
        },
        {
          '@type': 'HowToStep',
          name: 'Analyze Results',
          text: 'Review comprehensive analytics including stamina chart and consistency metrics',
          position: 5,
        },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 pt-20 pb-16">
        <Breadcrumbs items={[{ label: '5 Minute Typing Test', href: '/5-minute-typing-test' }]} />

        {/* Hero Section */}
        <section className="max-w-4xl mx-auto text-center pt-8 pb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-cyan-400 mb-6">
            5 Minute Typing Test
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8">
            Professional-grade endurance test for maximum accuracy
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href="/test">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-8 py-6" data-testid="button-start-5min-test">
                <Timer className="mr-2 h-5 w-5" />
                Start 5 Minute Test
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
            Why Choose a 5 Minute Typing Test?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Target className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Maximum Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  5 minutes provides the most statistically accurate measure of your true typing ability by averaging performance over extended time.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Stamina Training</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Build typing endurance essential for long documents, coding sessions, and professional work requiring sustained focus.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Award className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Job Assessment Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Many employers require 5-minute typing tests. Practice with the same format to excel in job applications and certifications.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <Brain className="h-12 w-12 text-cyan-400 mb-4" />
                <CardTitle className="text-white">Deep Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Longer tests generate richer data for AI analysis. Get detailed insights on consistency, stamina decline, and improvement areas.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="max-w-4xl mx-auto py-16">
          <article className="prose prose-invert prose-cyan max-w-none">
            <h2 className="text-3xl font-bold text-white">What is a 5 Minute Typing Test?</h2>
            <p className="text-lg text-slate-300 leading-relaxed">
              A <strong>5 minute typing test</strong> is the professional standard for measuring sustained typing performance. Over 300 seconds, you'll demonstrate not just your peak speed but your ability to maintain consistency, accuracy, and focus during extended typing sessions. This format is used by employers, certification programs, and typing competitions worldwide.
            </p>

            <h3 className="text-2xl font-bold text-white mt-8">Professional Typing Standards (5-Minute Test)</h3>
            <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
              <li><strong>Data Entry:</strong> 40-50 WPM minimum requirement</li>
              <li><strong>Administrative:</strong> 50-60 WPM expected for office work</li>
              <li><strong>Transcriptionist:</strong> 60-80 WPM with 95%+ accuracy</li>
              <li><strong>Court Reporter:</strong> 80-120 WPM with near-perfect accuracy</li>
              <li><strong>Professional Typist:</strong> 100+ WPM sustained over 5 minutes</li>
              <li><strong>Elite Competitor:</strong> 120+ WPM with 98%+ accuracy</li>
            </ul>

            <h3 className="text-2xl font-bold text-white mt-8">Why 5 Minutes is the Professional Standard</h3>
            <p className="text-lg text-slate-300 leading-relaxed">
              The <strong>5-minute duration</strong> reveals your true professional capability:
            </p>
            <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
              <li><strong>Eliminates luck</strong> - Can't maintain artificial speed for 5 full minutes</li>
              <li><strong>Tests stamina</strong> - Reveals if you can sustain pace or fade over time</li>
              <li><strong>Simulates work</strong> - Mirrors real-world typing tasks like report writing</li>
              <li><strong>Highest accuracy</strong> - Statistical law of large numbers minimizes variance</li>
              <li><strong>Industry standard</strong> - Most professional certifications use 5-minute tests</li>
              <li><strong>Comprehensive analytics</strong> - Enough data to identify specific weaknesses</li>
            </ul>

            <h3 className="text-2xl font-bold text-white mt-8">Training Strategy for 5-Minute Tests</h3>
            <ol className="list-decimal list-inside space-y-3 text-lg text-slate-300">
              <li><strong>Build gradually</strong> - Master 1-minute tests, then 3-minute, before attempting 5</li>
              <li><strong>Focus on consistency</strong> - Aim for steady WPM throughout, not fast starts</li>
              <li><strong>Pace yourself</strong> - Start at 90% max speed to preserve stamina</li>
              <li><strong>Prioritize accuracy</strong> - Each error impacts your score more over longer tests</li>
              <li><strong>Practice posture</strong> - Proper ergonomics prevents fatigue in longer sessions</li>
              <li><strong>Mental endurance</strong> - Stay focused for full 5 minutes; concentration matters</li>
              <li><strong>Regular breaks</strong> - Don't take multiple 5-minute tests back-to-back; rest hands</li>
            </ol>

            <h3 className="text-2xl font-bold text-white mt-8">Common Challenges in 5-Minute Tests</h3>
            <div className="space-y-4">
              <div className="bg-slate-800/50 border-l-4 border-yellow-500 p-4">
                <h4 className="text-lg font-bold text-yellow-400 mb-2">Speed Decline</h4>
                <p className="text-slate-300">
                  <strong>Problem:</strong> Starting fast but slowing significantly by minute 3-4.<br />
                  <strong>Solution:</strong> Start at 80-85% of max speed and maintain it. Practice longer 3-5 minute sessions to build stamina.
                </p>
              </div>

              <div className="bg-slate-800/50 border-l-4 border-yellow-500 p-4">
                <h4 className="text-lg font-bold text-yellow-400 mb-2">Accuracy Drop</h4>
                <p className="text-slate-300">
                  <strong>Problem:</strong> Making more errors as test progresses due to fatigue.<br />
                  <strong>Solution:</strong> Slow down by 5 WPM and focus on precision. Better to finish strong at 70 WPM than fade to 60 WPM.
                </p>
              </div>

              <div className="bg-slate-800/50 border-l-4 border-yellow-500 p-4">
                <h4 className="text-lg font-bold text-yellow-400 mb-2">Mental Fatigue</h4>
                <p className="text-slate-300">
                  <strong>Problem:</strong> Losing concentration around minute 3.<br />
                  <strong>Solution:</strong> Practice meditation and focus exercises. Break test into mental "checkpoints" every 60 seconds.
                </p>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mt-8">How Employers Use 5-Minute Tests</h3>
            <p className="text-lg text-slate-300 leading-relaxed">
              Many companies require typing tests as part of their hiring process. Here's what they look for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
              <li><strong>Minimum WPM threshold</strong> - Usually 40-60 WPM depending on role</li>
              <li><strong>Accuracy requirement</strong> - Typically 95% or higher for professional positions</li>
              <li><strong>Consistency check</strong> - Looking for steady performance, not erratic speed changes</li>
              <li><strong>Stamina verification</strong> - Ensuring you can maintain pace during full workday</li>
              <li><strong>Error pattern analysis</strong> - Some roles (data entry) require near-zero errors</li>
            </ul>

            <h3 className="text-2xl font-bold text-white mt-8">Advanced Features for 5-Minute Tests</h3>
            <ul className="list-disc list-inside space-y-2 text-lg text-slate-300">
              <li>📊 <strong>Stamina analysis chart</strong> - See WPM progression minute-by-minute</li>
              <li>🎯 <strong>Consistency score</strong> - Measures how steady your speed remains</li>
              <li>🔥 <strong>Fatigue detection</strong> - AI identifies when/where speed drops occur</li>
              <li>🧠 <strong>Deep analytics</strong> - Keystroke timing, finger usage, hand balance</li>
              <li>📈 <strong>Historical comparison</strong> - Track improvement over multiple tests</li>
              <li>🏆 <strong>Elite leaderboards</strong> - Compare with top 5-minute test performers</li>
              <li>💪 <strong>Endurance training plan</strong> - AI generates stamina-building exercises</li>
            </ul>

            <div className="bg-slate-800/50 border-l-4 border-cyan-500 p-6 my-8">
              <h4 className="text-xl font-bold text-cyan-400 mb-2">Pro Tip for Job Tests</h4>
              <p className="text-slate-300">
                If preparing for an employment typing test, practice 5-minute tests in the same environment and time of day as your scheduled assessment. Take at least 5 practice tests and aim to score 10 WPM above the job requirement to account for test-day anxiety.
              </p>
            </div>

            <h3 className="text-2xl font-bold text-white mt-8">Frequently Asked Questions</h3>
            
            <h4 className="text-xl font-semibold text-cyan-400 mt-6">Is 5 minutes too long for a typing test?</h4>
            <p className="text-lg text-slate-300">
              For beginners, yes - start with 1-3 minute tests first. But for professional assessment and certification, 5 minutes is the standard because it accurately reflects your sustained typing ability, not just short bursts.
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">What's a good score on a 5-minute typing test?</h4>
            <p className="text-lg text-slate-300">
              40+ WPM is acceptable for most jobs. 60-80 WPM is professional level. 80+ WPM is excellent. 100+ WPM places you in the elite category. But remember: accuracy matters more than speed!
            </p>

            <h4 className="text-xl font-semibold text-cyan-400 mt-6">How can I prevent fatigue during 5-minute tests?</h4>
            <p className="text-lg text-slate-300">
              Build stamina gradually through practice. Use proper ergonomics, keep wrists neutral, take regular practice breaks (not during the test!), and start at a sustainable pace rather than sprinting. Treat it like a marathon, not a sprint.
            </p>

            <div className="text-center mt-12">
              <Link href="/test">
                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-12 py-6" data-testid="button-start-test-bottom">
                  <Timer className="mr-2 h-6 w-6" />
                  Start Your Free 5 Minute Professional Test
                </Button>
              </Link>
            </div>
          </article>
        </section>

        {/* Related Tests */}
        <section className="max-w-6xl mx-auto py-16">
          <h2 className="text-3xl font-bold text-center text-white mb-12">Choose Your Test Duration</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/1-minute-typing-test">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-1min-test">
                <CardHeader>
                  <CardTitle className="text-white">1 Minute Test</CardTitle>
                  <CardDescription className="text-slate-400">
                    Quick speed assessment for beginners and warm-ups
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/3-minute-typing-test">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-3min-test">
                <CardHeader>
                  <CardTitle className="text-white">3 Minute Test</CardTitle>
                  <CardDescription className="text-slate-400">
                    Industry standard for accurate WPM measurement
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/multiplayer">
              <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500 transition-colors cursor-pointer" data-testid="card-multiplayer">
                <CardHeader>
                  <CardTitle className="text-white">Multiplayer Race</CardTitle>
                  <CardDescription className="text-slate-400">
                    Compete against other typists in real-time races
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
