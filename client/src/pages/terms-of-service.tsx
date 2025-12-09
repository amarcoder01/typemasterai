import { Link } from "wouter";
import { FileText, Mail } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto" data-testid="page-terms-of-service">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold" data-testid="heading-terms-of-service">Terms of Service</h1>
            <p className="text-muted-foreground text-sm mt-1">Last Updated: December 8, 2025</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          Welcome to TypeMasterAI! These Terms of Service govern your use of our typing test platform. By using TypeMasterAI, you agree to these terms.
        </p>
      </div>

      <div className="space-y-8 prose prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using TypeMasterAI ("the Service"), you agree to be bound by these Terms of Service and our <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">2. Description of Service</h2>
          <p className="text-muted-foreground mb-4">
            TypeMasterAI provides:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>AI-powered typing speed tests in 23+ languages</li>
            <li>Real-time performance analytics and progress tracking</li>
            <li>Global leaderboards and competitive rankings</li>
            <li>AI chat assistant for typing improvement tips</li>
            <li>Custom content generation and paragraph modes</li>
            <li>Downloadable achievement certificates</li>
            <li>User profiles and personalization features</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">3. User Accounts</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">3.1 Account Creation</h3>
          <p className="text-muted-foreground mb-4">
            To access certain features, you must create an account. You agree to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and update your information as needed</li>
            <li>Keep your password secure and confidential</li>
            <li>Be at least 13 years of age</li>
            <li>Notify us immediately of any unauthorized access</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">3.2 Account Responsibility</h3>
          <p className="text-muted-foreground">
            You are responsible for all activities that occur under your account. TypeMasterAI is not liable for any loss or damage arising from unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">4. Acceptable Use Policy</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">4.1 Permitted Use</h3>
          <p className="text-muted-foreground mb-4">
            You may use TypeMasterAI for:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Personal typing practice and skill improvement</li>
            <li>Educational purposes and learning</li>
            <li>Fair competition on leaderboards</li>
            <li>Legitimate interaction with AI features</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">4.2 Prohibited Activities</h3>
          <p className="text-muted-foreground mb-4">
            You must not:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Use automated scripts, bots, or cheating tools to manipulate test results</li>
            <li>Create multiple accounts to artificially inflate rankings</li>
            <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Upload malicious code, viruses, or harmful content</li>
            <li>Scrape, copy, or replicate our content or data without permission</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">5. AI-Generated Content</h2>
          <p className="text-muted-foreground mb-4">
            TypeMasterAI uses OpenAI's GPT-4 technology for content generation. You acknowledge that:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>AI-generated content may occasionally contain errors or inaccuracies</li>
            <li>Content is generated in real-time and may vary in quality</li>
            <li>We do not guarantee the suitability of all AI-generated content</li>
            <li>You should report any inappropriate or offensive content immediately</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">6. Intellectual Property Rights</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">6.1 Our Property</h3>
          <p className="text-muted-foreground mb-4">
            TypeMasterAI and all content, features, and functionality are owned by TypeMasterAI and protected by copyright, trademark, and other intellectual property laws. This includes:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Website design, graphics, and user interface</li>
            <li>TypeMasterAI name, logo, and branding</li>
            <li>Software, code, and algorithms</li>
            <li>Typing test paragraphs and content database</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">6.2 Your Content</h3>
          <p className="text-muted-foreground">
            You retain ownership of your profile information and custom content. By using TypeMasterAI, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and process your data as necessary to provide the Service and as described in our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">7. Leaderboards and Rankings</h2>
          <p className="text-muted-foreground mb-4">
            Our leaderboards display typing performance publicly. By participating:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Your username and scores will be publicly visible</li>
            <li>Rankings are calculated based on legitimate test results</li>
            <li>We reserve the right to remove suspicious or fraudulent scores</li>
            <li>Cheating or manipulation may result in account suspension or ban</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">8. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TypeMasterAI DOES NOT WARRANT THAT:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
            <li>The Service will be uninterrupted, secure, or error-free</li>
            <li>Results from typing tests are completely accurate</li>
            <li>Defects will be corrected immediately</li>
            <li>The Service is free from viruses or harmful components</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">9. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, TypeMasterAI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR OTHER INTANGIBLE LOSSES.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">10. Indemnification</h2>
          <p className="text-muted-foreground mb-4">
            You agree to indemnify, defend, and hold harmless TypeMasterAI, its affiliates, officers, directors, employees, agents, licensors, and suppliers from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Your violation of these Terms of Service</li>
            <li>Your use of the Service in a manner that infringes intellectual property rights or violates laws</li>
            <li>Any content you submit, post, or transmit through the Service</li>
            <li>Your violation of any rights of another user or third party</li>
            <li>Any fraudulent or manipulative activity on your account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">11. Force Majeure</h2>
          <p className="text-muted-foreground">
            TypeMasterAI shall not be liable for any failure or delay in performing its obligations under these Terms if such failure or delay results from circumstances beyond its reasonable control, including but not limited to: acts of God, natural disasters, pandemics, war, terrorism, riots, government actions, power failures, internet outages, third-party service provider failures, or cyberattacks. In such events, our obligations shall be suspended for the duration of the force majeure event.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">12. Account Termination</h2>
          
          <h3 className="text-xl font-semibold text-foreground mb-3">12.1 Termination by You</h3>
          <p className="text-muted-foreground">
            You may delete your account at any time through your account settings. Upon deletion, your personal data will be removed in accordance with our Privacy Policy.
          </p>

          <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">12.2 Termination by Us</h3>
          <p className="text-muted-foreground mb-4">
            We may suspend or terminate your account if:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>You violate these Terms of Service</li>
            <li>You engage in fraudulent, abusive, or illegal activities</li>
            <li>Your account has been inactive for an extended period</li>
            <li>We are required to do so by law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">13. Service Availability</h2>
          <p className="text-muted-foreground">
            TypeMasterAI is currently free to use. We reserve the right to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Introduce premium features or subscription plans in the future</li>
            <li>Modify, suspend, or discontinue any part of the Service</li>
            <li>Change pricing with reasonable notice</li>
            <li>Implement usage limits or rate limiting</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">14. Changes to Terms</h2>
          <p className="text-muted-foreground">
            We may update these Terms of Service at any time. Significant changes will be communicated via email or a prominent notice on the platform. Your continued use of TypeMasterAI after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">15. Governing Law</h2>
          <p className="text-muted-foreground">
            These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts in Solapur, Maharashtra, India.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">16. Severability</h2>
          <p className="text-muted-foreground">
            If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
          </p>
        </section>

        <section className="bg-card/30 p-8 rounded-xl border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">Contact Information</h2>
          <p className="text-muted-foreground mb-6">
            For questions about these Terms of Service, please contact us:
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
