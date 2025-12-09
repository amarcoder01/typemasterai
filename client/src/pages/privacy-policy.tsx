import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto" data-testid="page-privacy-policy">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2" data-testid="heading-privacy-policy">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-6">Last Updated: December 9, 2025</p>
        <p className="text-muted-foreground text-lg leading-relaxed">
          At TypeMasterAI, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our typing test platform.
        </p>
      </div>

      <div className="space-y-10 prose prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">1. Information We Collect</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">1.1 Personal Information</h3>
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
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">2. How We Use Your Information</h2>
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
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">3. AI and OpenAI Integration</h2>
          <p className="text-muted-foreground mb-4">
            TypeMasterAI uses OpenAI's GPT-4 and GPT-4o technology to power:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>AI chat assistant for typing tips and guidance (GPT-4o with web search capabilities)</li>
            <li>Automatic paragraph generation for typing tests (GPT-4o-mini)</li>
            <li>Code snippet generation for programming practice (GPT-4o-mini)</li>
            <li>AI Ghost Racers in multiplayer mode (GPT-4o-mini for username generation)</li>
          </ul>
          
          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">3.1 Data Sent to OpenAI</h3>
          <p className="text-muted-foreground mb-4">
            When you use AI features, the following data may be sent to OpenAI:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Your chat messages and conversation context</li>
            <li>Selected language and content preferences</li>
            <li>Programming language selection for code mode</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            <strong className="text-foreground">Important:</strong> We do not send your personal account information, typing test results, or analytics data to OpenAI unless you explicitly include it in your messages.
          </p>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">3.2 OpenAI Data Retention</h3>
          <p className="text-muted-foreground mb-4">
            OpenAI retains API data for up to 30 days for abuse monitoring, then deletes it. OpenAI does <strong className="text-foreground">not</strong> use API data to train their models without explicit consent.
          </p>
          <p className="text-muted-foreground">
            OpenAI's data usage is governed by their <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a> and <a href="https://openai.com/policies/api-data-usage-policies" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">API Data Usage Policies</a>. For complete details on our AI practices, see our <Link href="/ai-transparency" className="text-primary hover:underline">AI Transparency Notice</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">4. Data Storage and Security</h2>
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
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">5. Data Sharing and Disclosure</h2>
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
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">6. Cookies and Tracking</h2>
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
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">7. Your Rights and Choices</h2>
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
            To exercise these rights, contact us at <a href="mailto:support@typemasterai.com" className="text-primary hover:underline">support@typemasterai.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">8. Children's Privacy</h2>
          <p className="text-muted-foreground">
            TypeMasterAI is intended for users aged 13 and above. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">9. Data Retention</h2>
          <p className="text-muted-foreground mb-4">
            We retain your personal data only for as long as necessary to fulfill the purposes outlined in this policy:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Account Data:</strong> Retained while your account is active and for 30 days after deletion request</li>
            <li><strong className="text-foreground">Typing Test History:</strong> Retained for 2 years from test completion, or until account deletion</li>
            <li><strong className="text-foreground">Analytics Data:</strong> Aggregated and anonymized after 90 days</li>
            <li><strong className="text-foreground">AI Conversation Logs:</strong> Automatically purged after 30 days</li>
            <li><strong className="text-foreground">Session Logs:</strong> Deleted after 7 days</li>
            <li><strong className="text-foreground">Backup Data:</strong> Retained for up to 90 days for disaster recovery</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            After the retention period, data is securely deleted or anonymized in accordance with industry best practices.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">10. European Union Users (GDPR)</h2>
          <p className="text-muted-foreground mb-4">
            If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have additional rights under the General Data Protection Regulation (GDPR):
          </p>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">10.1 Legal Basis for Processing</h3>
          <p className="text-muted-foreground mb-4">
            We process your personal data based on:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Contract Performance:</strong> To provide typing tests, analytics, and account services you've requested</li>
            <li><strong className="text-foreground">Legitimate Interests:</strong> To improve our platform, prevent fraud, and ensure security</li>
            <li><strong className="text-foreground">Consent:</strong> For optional features like marketing communications and analytics cookies</li>
            <li><strong className="text-foreground">Legal Obligations:</strong> To comply with applicable laws and regulations</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">10.2 Your GDPR Rights</h3>
          <p className="text-muted-foreground mb-4">
            Under GDPR, you have the right to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Access:</strong> Request a copy of your personal data in a portable format</li>
            <li><strong className="text-foreground">Rectification:</strong> Correct inaccurate or incomplete personal data</li>
            <li><strong className="text-foreground">Erasure:</strong> Request deletion of your personal data ("Right to be Forgotten")</li>
            <li><strong className="text-foreground">Restrict Processing:</strong> Limit how we use your data in certain circumstances</li>
            <li><strong className="text-foreground">Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
            <li><strong className="text-foreground">Object:</strong> Opt out of processing based on legitimate interests</li>
            <li><strong className="text-foreground">Withdraw Consent:</strong> Withdraw previously given consent at any time</li>
            <li><strong className="text-foreground">Lodge Complaint:</strong> File a complaint with your local data protection authority</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            To exercise these rights, contact us at <a href="mailto:support@typemasterai.com" className="text-primary hover:underline">support@typemasterai.com</a>. We will respond within 30 days.
          </p>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">10.3 International Data Transfers</h3>
          <p className="text-muted-foreground">
            Your data may be transferred to the United States. We ensure appropriate safeguards through Standard Contractual Clauses (SCCs) and other legally recognized transfer mechanisms to protect your data during international transfers.
          </p>
        </section>

        <section id="california-residents">
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">11. California Residents (CCPA/CPRA)</h2>
          <p className="text-muted-foreground mb-4">
            If you are a California resident, the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA) provide you with additional rights:
          </p>

          <h3 className="text-xl font-semibold text-foreground mb-3">11.1 Your California Privacy Rights</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Right to Know:</strong> Request disclosure of personal information we collect, use, disclose, and sell</li>
            <li><strong className="text-foreground">Right to Delete:</strong> Request deletion of your personal information</li>
            <li><strong className="text-foreground">Right to Correct:</strong> Request correction of inaccurate personal information</li>
            <li><strong className="text-foreground">Right to Opt-Out:</strong> Opt out of the sale or sharing of personal information</li>
            <li><strong className="text-foreground">Right to Limit:</strong> Limit use of sensitive personal information</li>
            <li><strong className="text-foreground">Non-Discrimination:</strong> Receive equal service and pricing regardless of exercising privacy rights</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">11.2 Categories of Personal Information</h3>
          <p className="text-muted-foreground mb-4">
            In the past 12 months, we have collected the following categories of personal information:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Identifiers (username, email address, IP address)</li>
            <li>Internet activity (typing test results, browsing history on our platform)</li>
            <li>Geolocation data (approximate location from IP address)</li>
            <li>Inferences (typing skill level, improvement patterns)</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">11.3 Do Not Sell or Share</h3>
          <p className="text-muted-foreground">
            <strong className="text-foreground">TypeMasterAI does not sell your personal information.</strong> We do not share your personal information for cross-context behavioral advertising. To exercise any California privacy rights, contact us at <a href="mailto:support@typemasterai.com" className="text-primary hover:underline">support@typemasterai.com</a>. We will verify your identity and respond within 45 days.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">12. International Users</h2>
          <p className="text-muted-foreground">
            TypeMasterAI is operated from the United States. If you access our service from outside the US, your information may be transferred to, stored, and processed in the United States. By using our service, you consent to this transfer. We implement appropriate safeguards to protect your data during international transfers, including Standard Contractual Clauses for EU data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">13. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy periodically. We will notify you of significant changes by email or through a prominent notice on our platform. Your continued use of TypeMasterAI after changes indicates acceptance of the updated policy.
          </p>
        </section>

        <section className="bg-card/30 p-8 rounded-xl border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">Contact Us</h2>
          <p className="text-muted-foreground mb-6">
            If you have questions or concerns about this Privacy Policy, please contact us:
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
