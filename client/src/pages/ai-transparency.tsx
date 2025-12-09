import { Link } from "wouter";

export default function AITransparency() {
  return (
    <div className="max-w-4xl mx-auto" data-testid="page-ai-transparency">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="heading-ai-transparency">AI Transparency Notice</h1>
        <p className="text-muted-foreground text-sm mb-4">Last Updated: December 9, 2025</p>
        <p className="text-muted-foreground text-lg">
          TypeMasterAI is committed to transparency about our use of artificial intelligence. This page explains how we use AI technology, what data is processed, and your rights regarding AI-powered features.
        </p>
      </div>

      <div className="space-y-10 prose prose-invert max-w-none">
        <section className="bg-primary/5 p-6 rounded-lg border border-primary/20">
          <h2 className="text-xl font-bold text-foreground mb-2">AI Systems We Use</h2>
          <p className="text-muted-foreground">
            TypeMasterAI uses third-party artificial intelligence platforms to power various features. When you interact with AI features on our platform, you are communicating with an automated artificial intelligence system, not a human.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">1. AI-Powered Features</h2>
          <p className="text-muted-foreground mb-4">
            The following features on TypeMasterAI use artificial intelligence:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                AI Chat Assistant
              </h3>
              <p className="text-sm text-muted-foreground">
                Our AI typing coach provides personalized tips, answers questions about typing improvement, and offers guidance using advanced language models.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Paragraph Generation
              </h3>
              <p className="text-sm text-muted-foreground">
                Typing test paragraphs are dynamically generated using AI to ensure fresh, contextually relevant content in 23+ languages.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Code Snippet Generation
              </h3>
              <p className="text-sm text-muted-foreground">
                Code typing mode generates programming code snippets across multiple languages using AI for realistic coding practice.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                AI Ghost Racers
              </h3>
              <p className="text-sm text-muted-foreground">
                In multiplayer races, AI-powered bots may join to ensure engaging competitions even when fewer human players are available.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">2. How AI Processes Your Data</h2>
          <p className="text-muted-foreground mb-4">
            When you use AI features, the following data may be sent to our third-party AI service providers for processing:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">AI Chat:</strong> Your messages and conversation history within the current session</li>
            <li><strong className="text-foreground">Paragraph Generation:</strong> Selected language, category preferences, and difficulty settings</li>
            <li><strong className="text-foreground">Code Generation:</strong> Selected programming language and complexity level</li>
            <li><strong className="text-foreground">Web Search:</strong> When enabled, your queries may be used to search the internet for current information</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            <strong className="text-foreground">Important:</strong> We do not send your personal account information, typing test results, or analytics data to AI providers unless you explicitly include it in your chat messages.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">3. Data Retention by AI Providers</h2>
          <p className="text-muted-foreground mb-4">
            Our third-party AI service providers handle data according to industry-standard practices:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>API data is typically retained for limited periods (e.g., 30 days) for security and abuse monitoring, then deleted</li>
            <li>AI providers do not use API data to train their models without explicit consent</li>
            <li>Data is processed internationally in countries where AI infrastructure providers operate</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            <strong className="text-foreground">Detailed Vendor Information:</strong> A complete list of our AI service providers and their data practices is available upon request. Contact us at <a href="mailto:support@typemasterai.com" className="text-primary hover:underline">support@typemasterai.com</a> for this information.
          </p>
        </section>

        <section className="bg-amber-500/10 p-6 rounded-lg border border-amber-500/20">
          <h2 className="text-xl font-bold text-foreground mb-3 pb-2 border-b border-amber-500/20">4. AI Limitations & Accuracy</h2>
          <p className="text-muted-foreground mb-4">
            Please be aware of the following limitations:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>AI-generated content may contain <strong className="text-foreground">factual errors or inaccuracies</strong></li>
            <li>AI responses are generated in real-time and may vary in quality</li>
            <li>AI cannot provide <strong className="text-foreground">professional advice</strong> (medical, legal, financial)</li>
            <li>Generated code snippets may contain bugs or security vulnerabilities</li>
            <li>AI chat does not have memory of previous sessions unless specifically designed</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            <strong className="text-foreground">Always verify important information</strong> from reliable sources before relying on AI-generated content.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">5. Your Rights & Controls</h2>
          <p className="text-muted-foreground mb-4">
            You have the following rights regarding AI features:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Opt-Out:</strong> You can use TypeMasterAI without interacting with AI features (use pre-generated paragraphs instead)</li>
            <li><strong className="text-foreground">Data Access:</strong> Request information about data sent to AI providers</li>
            <li><strong className="text-foreground">Deletion:</strong> Request deletion of your AI conversation history</li>
            <li><strong className="text-foreground">Report Issues:</strong> Flag inappropriate or harmful AI-generated content</li>
            <li><strong className="text-foreground">Vendor Details:</strong> Request a list of specific AI service providers we use</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">6. EU AI Act Compliance</h2>
          <p className="text-muted-foreground mb-4">
            In compliance with the European Union AI Act (Regulation (EU) 2024/1689):
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>We clearly disclose that our chatbot is powered by artificial intelligence</li>
            <li>AI-generated content is identified where applicable</li>
            <li>We do not use prohibited AI practices (social scoring, subliminal manipulation, etc.)</li>
            <li>Our AI usage falls under "limited-risk" category requiring transparency obligations</li>
            <li>Detailed technical information about our AI systems is available upon request</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">7. Updates to This Notice</h2>
          <p className="text-muted-foreground">
            We may update this AI Transparency Notice as our AI features evolve or as regulations change. Significant updates will be communicated through our platform. We encourage you to review this page periodically.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">8. Related Policies</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              <span className="text-muted-foreground"> - How we collect and protect your personal data</span>
            </li>
            <li>
              <Link href="/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
              <span className="text-muted-foreground"> - Rules for using TypeMasterAI</span>
            </li>
            <li>
              <Link href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>
              <span className="text-muted-foreground"> - How we use cookies and tracking technologies</span>
            </li>
          </ul>
        </section>

        <section className="bg-card/30 p-8 rounded-xl border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">Questions About Our AI?</h2>
          <p className="text-muted-foreground mb-6">
            If you have questions about our use of artificial intelligence, please contact us:
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Email</p>
              <a href="mailto:support@typemasterai.com" className="text-primary hover:underline text-lg">
                support@typemasterai.com
              </a>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Mailing Address</p>
              <p className="text-muted-foreground">
                TypeMasterAI<br />
                Solapur, Maharashtra 413224<br />
                India
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
