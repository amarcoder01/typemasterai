import { Link } from "wouter";
import { Cookie, Mail } from "lucide-react";

export default function CookiePolicy() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Cookie className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Cookie Policy</h1>
            <p className="text-muted-foreground text-sm mt-1">Last Updated: November 24, 2025</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          This Cookie Policy explains how TypeMasterAI uses cookies and similar technologies to recognize you when you visit our platform.
        </p>
      </div>

      <div className="space-y-8 prose prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">1. What Are Cookies?</h2>
          <p className="text-muted-foreground">
            Cookies are small text files that are placed on your device (computer, smartphone, or tablet) when you visit a website. They help websites remember your preferences and improve your browsing experience.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">2. Types of Cookies We Use</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">2.1 Strictly Necessary Cookies</h3>
          <p className="text-muted-foreground mb-4">
            These cookies are essential for the platform to function properly and cannot be disabled.
          </p>
          <div className="bg-card/30 p-4 rounded-lg border border-border space-y-3">
            <div>
              <p className="font-semibold text-foreground">Session Cookies</p>
              <p className="text-sm text-muted-foreground">Used for authentication and maintaining your login state</p>
              <p className="text-xs text-muted-foreground mt-1">Duration: Session (deleted when browser closes)</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Security Cookies</p>
              <p className="text-sm text-muted-foreground">Protect against CSRF attacks and ensure secure connections</p>
              <p className="text-xs text-muted-foreground mt-1">Duration: Session to 1 day</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.2 Functional Cookies</h3>
          <p className="text-muted-foreground mb-4">
            These cookies enable enhanced functionality and personalization.
          </p>
          <div className="bg-card/30 p-4 rounded-lg border border-border space-y-3">
            <div>
              <p className="font-semibold text-foreground">Theme Preference</p>
              <p className="text-sm text-muted-foreground">Remembers your dark/light mode preference</p>
              <p className="text-xs text-muted-foreground mt-1">Cookie name: <code className="bg-accent px-1 rounded">typemasterai-theme</code></p>
              <p className="text-xs text-muted-foreground">Duration: 1 year</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Test Settings</p>
              <p className="text-sm text-muted-foreground">Saves your preferred language, mode, and test duration</p>
              <p className="text-xs text-muted-foreground mt-1">Duration: 30 days</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">User Preferences</p>
              <p className="text-sm text-muted-foreground">Stores keyboard layout, country, and other profile settings</p>
              <p className="text-xs text-muted-foreground mt-1">Duration: 90 days</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.3 Analytics Cookies</h3>
          <p className="text-muted-foreground mb-4">
            These cookies help us understand how visitors interact with our platform.
          </p>
          <div className="bg-card/30 p-4 rounded-lg border border-border space-y-3">
            <div>
              <p className="font-semibold text-foreground">Usage Analytics</p>
              <p className="text-sm text-muted-foreground">Tracks page views, test completions, and feature usage</p>
              <p className="text-xs text-muted-foreground mt-1">Duration: 2 years</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Performance Metrics</p>
              <p className="text-sm text-muted-foreground">Monitors load times, errors, and system performance</p>
              <p className="text-xs text-muted-foreground mt-1">Duration: 1 year</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">2.4 Local Storage</h3>
          <p className="text-muted-foreground mb-4">
            We also use browser local storage for:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Caching typing test paragraphs for offline access</li>
            <li>Storing temporary test state (current progress, time remaining)</li>
            <li>Saving draft messages in AI chat</li>
            <li>Maintaining UI state (sidebar collapse, dialog positions)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">3. Third-Party Cookies</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">3.1 OpenAI API</h3>
          <p className="text-muted-foreground">
            When you use our AI features (chat assistant, content generation), OpenAI may set cookies to process your requests. These are governed by <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI's Privacy Policy</a>.
          </p>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">3.2 Hosting and Infrastructure</h3>
          <p className="text-muted-foreground">
            Our hosting provider (Replit) may use cookies for security, load balancing, and service delivery. We do not control these third-party cookies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">4. Why We Use Cookies</h2>
          <p className="text-muted-foreground mb-4">
            We use cookies to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Keep you logged in:</strong> Maintain your authenticated session across pages</li>
            <li><strong className="text-foreground">Remember your preferences:</strong> Save your theme, language, and test settings</li>
            <li><strong className="text-foreground">Improve security:</strong> Prevent unauthorized access and protect against attacks</li>
            <li><strong className="text-foreground">Analyze usage:</strong> Understand how users interact with features to improve the platform</li>
            <li><strong className="text-foreground">Personalize experience:</strong> Show relevant content and recommendations</li>
            <li><strong className="text-foreground">Track progress:</strong> Save your typing test history and statistics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">5. Managing Cookies</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">5.1 Browser Settings</h3>
          <p className="text-muted-foreground mb-4">
            You can control and manage cookies through your browser settings:
          </p>
          <div className="bg-card/30 p-4 rounded-lg border border-border space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</p>
            <p><strong className="text-foreground">Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</p>
            <p><strong className="text-foreground">Safari:</strong> Preferences → Privacy → Manage Website Data</p>
            <p><strong className="text-foreground">Edge:</strong> Settings → Cookies and site permissions → Manage cookies</p>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">5.2 Disabling Cookies</h3>
          <p className="text-muted-foreground mb-4">
            You can block or delete cookies, but note that:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>You will need to log in every time you visit</li>
            <li>Your preferences and settings will not be saved</li>
            <li>Some features may not function properly</li>
            <li>Typing test progress may not be tracked correctly</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">5.3 Opt-Out Options</h3>
          <p className="text-muted-foreground">
            While you cannot opt out of strictly necessary cookies, you can control optional cookies through your account settings or browser preferences.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">6. Cookie Retention</h2>
          <p className="text-muted-foreground mb-4">
            Cookie retention periods vary by type:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Session cookies:</strong> Deleted when you close your browser</li>
            <li><strong className="text-foreground">Preference cookies:</strong> 30 days to 1 year</li>
            <li><strong className="text-foreground">Analytics cookies:</strong> Up to 2 years</li>
            <li><strong className="text-foreground">Authentication cookies:</strong> 30 days or until logout</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">7. Do Not Track</h2>
          <p className="text-muted-foreground">
            Some browsers have a "Do Not Track" (DNT) feature. Currently, there is no industry consensus on how to respond to DNT signals. TypeMasterAI does not currently respond to DNT browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">8. Updates to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date. We encourage you to review this policy periodically.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">9. Related Policies</h2>
          <p className="text-muted-foreground mb-4">
            For more information about how we handle your data:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              <span className="text-muted-foreground"> - How we collect and use your personal information</span>
            </li>
            <li>
              <Link href="/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
              <span className="text-muted-foreground"> - Rules and guidelines for using TypeMasterAI</span>
            </li>
          </ul>
        </section>

        <section className="bg-card/50 p-6 rounded-lg border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-4">Questions About Cookies?</h2>
          <p className="text-muted-foreground mb-4">
            If you have questions about our use of cookies, please contact us:
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4 text-primary" />
            <a href="mailto:privacy@typemasterai.com" className="text-primary hover:underline">
              privacy@typemasterai.com
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
