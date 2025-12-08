import { Link } from "wouter";
import { Shield, Mail } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Privacy Policy</h1>
            <p className="text-muted-foreground text-sm mt-1">Last Updated: December 8, 2025</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          At TypeMasterAI, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our typing test platform.
        </p>
      </div>

      <div className="space-y-8 prose prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">1. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">1.1 Personal Information</h3>
          <p className="text-muted-foreground mb-4">
            When you create an account, we collect:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Username and email address</li>
            <li>Password (encrypted and securely stored)</li>
            <li>Profile information (avatar color, bio, country, keyboard layout - optional)</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">1.2 Usage Data</h3>
          <p className="text-muted-foreground mb-4">
            We automatically collect information about your typing tests:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Typing speed (WPM), accuracy, and error rates</li>
            <li>Test modes, languages, and paragraph categories you use</li>
            <li>Timestamp and duration of each test</li>
            <li>Progress analytics and performance trends</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">1.3 Technical Information</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Browser type and version</li>
            <li>Device information and screen resolution</li>
            <li>IP address and approximate location</li>
            <li>Session data and cookies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">2. How We Use Your Information</h2>
          <p className="text-muted-foreground mb-4">
            We use the collected information for:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Account Management:</strong> Creating and maintaining your account, authentication, and password recovery</li>
            <li><strong className="text-foreground">Service Delivery:</strong> Providing typing tests, tracking progress, generating statistics and leaderboards</li>
            <li><strong className="text-foreground">AI Features:</strong> Powering our AI assistant and generating personalized typing content</li>
            <li><strong className="text-foreground">Improvement:</strong> Analyzing usage patterns to enhance our platform and user experience</li>
            <li><strong className="text-foreground">Communication:</strong> Sending important updates, security alerts, and feature announcements</li>
            <li><strong className="text-foreground">Security:</strong> Detecting and preventing fraud, abuse, and technical issues</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">3. AI and OpenAI Integration</h2>
          <p className="text-muted-foreground mb-4">
            TypeMasterAI uses OpenAI's GPT-4 technology to power:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>AI chat assistant for typing tips and guidance</li>
            <li>Automatic paragraph generation for typing tests</li>
            <li>Custom content creation based on your preferences</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            When you interact with AI features, your prompts and generated content are processed by OpenAI's API. OpenAI's data usage is governed by their <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a> and <a href="https://openai.com/policies/api-data-usage-policies" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">API Data Usage Policies</a>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">4. Data Storage and Security</h2>
          <p className="text-muted-foreground mb-4">
            We implement industry-standard security measures:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Passwords are encrypted using bcrypt with 10 rounds of hashing</li>
            <li>Secure HTTPS encryption for all data transmission</li>
            <li>PostgreSQL database with access controls and regular backups</li>
            <li>Session-based authentication with HTTP-only cookies</li>
            <li>Regular security audits and updates</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">5. Data Sharing and Disclosure</h2>
          <p className="text-muted-foreground mb-4">
            We do not sell your personal information. We may share data only in these circumstances:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Public Leaderboards:</strong> Your username and typing scores are publicly visible on leaderboards</li>
            <li><strong className="text-foreground">Service Providers:</strong> OpenAI for AI features, hosting providers for infrastructure</li>
            <li><strong className="text-foreground">Legal Requirements:</strong> When required by law, court order, or government request</li>
            <li><strong className="text-foreground">Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">6. Cookies and Tracking</h2>
          <p className="text-muted-foreground mb-4">
            We use cookies and similar technologies for:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Authentication and session management</li>
            <li>Remembering your preferences (theme, language, test settings)</li>
            <li>Analytics to understand how you use our platform</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            You can control cookies through your browser settings. See our <Link href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link> for more details.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">7. Your Rights and Choices</h2>
          <p className="text-muted-foreground mb-4">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Access:</strong> Request a copy of your personal data</li>
            <li><strong className="text-foreground">Correction:</strong> Update or correct your account information</li>
            <li><strong className="text-foreground">Deletion:</strong> Request deletion of your account and associated data</li>
            <li><strong className="text-foreground">Export:</strong> Download your typing test history and statistics</li>
            <li><strong className="text-foreground">Opt-out:</strong> Unsubscribe from promotional emails</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            To exercise these rights, contact us at <a href="mailto:privacy@typemasterai.com" className="text-primary hover:underline">privacy@typemasterai.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">8. Children's Privacy</h2>
          <p className="text-muted-foreground">
            TypeMasterAI is intended for users aged 13 and above. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">9. International Users</h2>
          <p className="text-muted-foreground">
            TypeMasterAI is operated from the United States. If you access our service from outside the US, your information may be transferred to, stored, and processed in the United States. By using our service, you consent to this transfer.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">10. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy periodically. We will notify you of significant changes by email or through a prominent notice on our platform. Your continued use of TypeMasterAI after changes indicates acceptance of the updated policy.
          </p>
        </section>

        <section className="bg-card/50 p-6 rounded-lg border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-4">Contact Us</h2>
          <p className="text-muted-foreground mb-4">
            If you have questions or concerns about this Privacy Policy, please contact us:
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4 text-primary" />
            <a href="mailto:privacy@typemasterai.com" className="text-primary hover:underline">
              privacy@typemasterai.com
            </a>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            TypeMasterAI<br />
            Privacy Department<br />
            TypeMasterAI.com
          </p>
        </section>
      </div>
    </div>
  );
}
