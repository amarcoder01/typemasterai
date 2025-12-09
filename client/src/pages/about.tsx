import { PLATFORM_STATS, formatNumber } from "@shared/platform-stats";

export default function About() {
  const stats = {
    totalUsers: PLATFORM_STATS.TOTAL_USERS,
    totalTests: PLATFORM_STATS.TOTAL_TESTS,
    totalLanguages: PLATFORM_STATS.TOTAL_LANGUAGES,
  };

  return (
    <div className="max-w-4xl mx-auto" data-testid="page-about">
      <div className="mb-16 text-center">
        <h1 className="text-5xl font-bold mb-4" data-testid="heading-about">About TypeMasterAI</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Empowering millions of users worldwide to master their typing skills through AI-powered technology and intelligent practice.
        </p>
      </div>

      <div className="space-y-16">
        <section>
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-primary/20">
            Our Mission
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            At TypeMasterAI, we believe that typing is more than just a skill—it's a gateway to productivity, creativity, and digital fluency. Our mission is to help people of all ages and backgrounds improve their typing speed and accuracy through cutting-edge AI technology, personalized training, and engaging practice sessions.
          </p>
        </section>

        <section className="bg-card/30 p-10 rounded-2xl border border-border">
          <h2 className="text-3xl font-bold mb-8">
            What Makes Us Different
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="font-semibold text-xl mb-2 text-primary">AI-Powered Content</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our platform uses GPT-4 to generate unlimited, contextually relevant typing paragraphs across {stats.totalLanguages}+ languages, ensuring fresh and engaging practice every time.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-xl mb-2 text-primary">Real-Time Analytics</h3>
              <p className="text-muted-foreground leading-relaxed">
                Track your progress with detailed statistics, visualized charts, and performance insights that help you identify strengths and areas for improvement.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-xl mb-2 text-primary">Global Accessibility</h3>
              <p className="text-muted-foreground leading-relaxed">
                Support for {stats.totalLanguages}+ languages including English, Spanish, French, Japanese, Chinese, Hindi, Arabic, and many more—making typing practice accessible worldwide.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-xl mb-2 text-primary">Achievements & Certificates</h3>
              <p className="text-muted-foreground leading-relaxed">
                Earn downloadable certificates for your accomplishments and compete on global leaderboards to showcase your typing prowess.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-primary/20">
            Our Story
          </h2>
          <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
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
          <div className="text-center p-8 bg-card/30 rounded-xl border border-border">
            <div className="text-5xl font-bold text-primary font-mono mb-3" data-testid="stat-languages">
              {stats.totalLanguages}+
            </div>
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Languages Supported</div>
          </div>
          <div className="text-center p-8 bg-card/30 rounded-xl border border-border">
            <div className="text-5xl font-bold text-primary font-mono mb-3" data-testid="stat-users">
              {formatNumber(stats.totalUsers)}
            </div>
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Active Users</div>
          </div>
          <div className="text-center p-8 bg-card/30 rounded-xl border border-border">
            <div className="text-5xl font-bold text-primary font-mono mb-3" data-testid="stat-tests">
              {formatNumber(stats.totalTests)}
            </div>
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Tests Completed</div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-primary/20">
            Who We Serve
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-card/20 rounded-xl border border-border/50">
              <h3 className="font-semibold text-xl mb-3 text-primary">Students & Learners</h3>
              <p className="text-muted-foreground leading-relaxed">
                Improve typing speed for essays, research papers, and online coursework. Build essential digital literacy skills for academic success.
              </p>
            </div>
            <div className="p-6 bg-card/20 rounded-xl border border-border/50">
              <h3 className="font-semibold text-xl mb-3 text-primary">Professionals</h3>
              <p className="text-muted-foreground leading-relaxed">
                Boost workplace productivity by typing faster and more accurately. Save hours every week with improved keyboard efficiency.
              </p>
            </div>
            <div className="p-6 bg-card/20 rounded-xl border border-border/50">
              <h3 className="font-semibold text-xl mb-3 text-primary">Developers & Coders</h3>
              <p className="text-muted-foreground leading-relaxed">
                Practice on programming-specific content and technical vocabulary. Master keyboard shortcuts and coding efficiency.
              </p>
            </div>
            <div className="p-6 bg-card/20 rounded-xl border border-border/50">
              <h3 className="font-semibold text-xl mb-3 text-primary">Language Enthusiasts</h3>
              <p className="text-muted-foreground leading-relaxed">
                Learn to type in new languages with our {stats.totalLanguages}+ language support. Perfect for multilingual individuals and language students.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 p-10 rounded-2xl border border-primary/20">
          <h2 className="text-3xl font-bold mb-4 text-center">Our Commitment</h2>
          <p className="text-muted-foreground text-center text-lg max-w-2xl mx-auto leading-relaxed">
            We're committed to continuous improvement, user privacy, and providing a free, accessible platform for anyone who wants to improve their typing skills. TypeMasterAI will always prioritize user experience, data security, and innovation in typing education.
          </p>
        </section>

        <section className="text-center pt-8 pb-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Master Your Typing?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of users improving their typing speed and accuracy every day.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-10 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg"
            data-testid="button-start-typing"
          >
            Start Typing Now
          </a>
        </section>
      </div>
    </div>
  );
}
