import { Users, Zap, Globe, Award, Heart, Target, Sparkles, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M+`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K+`;
  }
  return `${num}+`;
}

export default function About() {
  const { data: platformStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const response = await fetch("/api/platform-stats");
      if (!response.ok) throw new Error("Failed to fetch platform stats");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const stats = platformStats?.stats || { totalUsers: 0, totalTests: 0, totalLanguages: 23 };

  return (
    <div className="max-w-4xl mx-auto" data-testid="page-about">
      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-500 rounded-2xl flex items-center justify-center text-primary-foreground font-mono font-bold text-3xl mx-auto mb-6">
          T
        </div>
        <h1 className="text-5xl font-bold mb-4" data-testid="heading-about">About TypeMasterAI</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Empowering millions of users worldwide to master their typing skills through AI-powered technology and intelligent practice.
        </p>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            Our Mission
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            At TypeMasterAI, we believe that typing is more than just a skill—it's a gateway to productivity, creativity, and digital fluency. Our mission is to help people of all ages and backgrounds improve their typing speed and accuracy through cutting-edge AI technology, personalized training, and engaging practice sessions.
          </p>
        </section>

        <section className="bg-card/30 p-8 rounded-2xl border border-border">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            What Makes Us Different
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">AI-Powered Content</h3>
                  <p className="text-muted-foreground text-sm">
                    Our platform uses GPT-4 to generate unlimited, contextually relevant typing paragraphs across {stats.totalLanguages}+ languages, ensuring fresh and engaging practice every time.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Real-Time Analytics</h3>
                  <p className="text-muted-foreground text-sm">
                    Track your progress with detailed statistics, visualized charts, and performance insights that help you identify strengths and areas for improvement.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Global Accessibility</h3>
                  <p className="text-muted-foreground text-sm">
                    Support for {stats.totalLanguages}+ languages including English, Spanish, French, Japanese, Chinese, Hindi, Arabic, and many more—making typing practice accessible worldwide.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Achievements & Certificates</h3>
                  <p className="text-muted-foreground text-sm">
                    Earn downloadable certificates for your accomplishments and compete on global leaderboards to showcase your typing prowess.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Heart className="w-8 h-8 text-primary" />
            Our Story
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              TypeMasterAI was born from a simple observation: traditional typing tests were boring, repetitive, and failed to engage users beyond basic practice. We envisioned a platform that would transform typing practice into an intelligent, adaptive, and enjoyable experience.
            </p>
            <p>
              By harnessing the power of artificial intelligence, we created a typing platform that generates unlimited fresh content, provides personalized coaching through an AI assistant, and adapts to each user's skill level and interests. Whether you're a student looking to improve productivity, a professional aiming to boost efficiency, or a coding enthusiast practicing on technical content, TypeMasterAI has something for everyone.
            </p>
            <p>
              Today, we're proud to serve thousands of users across the globe, helping them achieve their typing goals and unlock their full potential in the digital world.
            </p>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-card/30 rounded-xl border border-border">
            <div className="text-4xl font-bold text-primary font-mono mb-2" data-testid="stat-languages">
              {stats.totalLanguages}+
            </div>
            <div className="text-sm text-muted-foreground">Languages Supported</div>
          </div>
          <div className="text-center p-6 bg-card/30 rounded-xl border border-border">
            <div className="text-4xl font-bold text-primary font-mono mb-2" data-testid="stat-users">
              {stats.totalUsers > 0 ? formatNumber(stats.totalUsers) : "Growing"}
            </div>
            <div className="text-sm text-muted-foreground">Registered Users</div>
          </div>
          <div className="text-center p-6 bg-card/30 rounded-xl border border-border">
            <div className="text-4xl font-bold text-primary font-mono mb-2" data-testid="stat-tests">
              {stats.totalTests > 0 ? formatNumber(stats.totalTests) : "Growing"}
            </div>
            <div className="text-sm text-muted-foreground">Tests Completed</div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Who We Serve
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-card/20 rounded-xl border border-border/50">
              <h3 className="font-semibold text-lg mb-2">Students & Learners</h3>
              <p className="text-muted-foreground text-sm">
                Improve typing speed for essays, research papers, and online coursework. Build essential digital literacy skills for academic success.
              </p>
            </div>
            <div className="p-6 bg-card/20 rounded-xl border border-border/50">
              <h3 className="font-semibold text-lg mb-2">Professionals</h3>
              <p className="text-muted-foreground text-sm">
                Boost workplace productivity by typing faster and more accurately. Save hours every week with improved keyboard efficiency.
              </p>
            </div>
            <div className="p-6 bg-card/20 rounded-xl border border-border/50">
              <h3 className="font-semibold text-lg mb-2">Developers & Coders</h3>
              <p className="text-muted-foreground text-sm">
                Practice on programming-specific content and technical vocabulary. Master keyboard shortcuts and coding efficiency.
              </p>
            </div>
            <div className="p-6 bg-card/20 rounded-xl border border-border/50">
              <h3 className="font-semibold text-lg mb-2">Language Enthusiasts</h3>
              <p className="text-muted-foreground text-sm">
                Learn to type in new languages with our {stats.totalLanguages}+ language support. Perfect for multilingual individuals and language students.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 p-8 rounded-2xl border border-primary/20">
          <h2 className="text-3xl font-bold mb-4 text-center">Our Commitment</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
            We're committed to continuous improvement, user privacy, and providing a free, accessible platform for anyone who wants to improve their typing skills. TypeMasterAI will always prioritize user experience, data security, and innovation in typing education.
          </p>
        </section>

        <section className="text-center pt-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Master Your Typing?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of users improving their typing speed and accuracy every day.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
            data-testid="button-start-typing"
          >
            Start Typing Now
          </a>
        </section>
      </div>
    </div>
  );
}
