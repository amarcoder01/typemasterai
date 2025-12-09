import { Link } from "wouter";

export default function AccessibilityStatement() {
  return (
    <div className="max-w-4xl mx-auto" data-testid="page-accessibility">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" data-testid="heading-accessibility">Accessibility Statement</h1>
        <p className="text-muted-foreground text-sm mb-4">Last Updated: December 9, 2025</p>
        <p className="text-muted-foreground text-lg">
          TypeMasterAI is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.
        </p>
      </div>

      <div className="space-y-10 prose prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">Our Commitment</h2>
          <p className="text-muted-foreground">
            We believe that typing practice should be accessible to everyone, regardless of ability. TypeMasterAI strives to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. These guidelines explain how to make web content more accessible for people with disabilities and more user-friendly for everyone.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">Accessibility Features</h2>
          <p className="text-muted-foreground mb-4">
            TypeMasterAI implements the following accessibility features:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Keyboard Navigation
              </h3>
              <p className="text-sm text-muted-foreground">
                All interactive elements can be accessed using keyboard navigation. Use Tab to move forward, Shift+Tab to move backward, and Enter/Space to activate.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Visual Contrast
              </h3>
              <p className="text-sm text-muted-foreground">
                We maintain a minimum 4.5:1 contrast ratio for normal text and 3:1 for large text, ensuring readability for users with visual impairments.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Screen Reader Support
              </h3>
              <p className="text-sm text-muted-foreground">
                Our platform is compatible with popular screen readers including NVDA, JAWS, and VoiceOver. We use semantic HTML and ARIA labels throughout the interface.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Responsive Design
              </h3>
              <p className="text-sm text-muted-foreground">
                TypeMasterAI works across devices of all sizes. Text can be resized up to 200% without loss of functionality, and content reflows appropriately.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Reduced Motion Support
              </h3>
              <p className="text-sm text-muted-foreground">
                Animations are disabled for users who prefer reduced motion, ensuring a less distracting experience for those with vestibular disorders.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2">
                Focus Indicators
              </h3>
              <p className="text-sm text-muted-foreground">
                Clear visual focus indicators help keyboard users understand which element is currently selected during navigation.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">Technical Implementation</h2>
          <p className="text-muted-foreground mb-4">
            Our accessibility compliance is built on industry-standard technologies and best practices:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Semantic HTML5:</strong> Proper use of heading hierarchy, landmarks, and meaningful element structure</li>
            <li><strong className="text-foreground">WAI-ARIA:</strong> Over 260 ARIA attributes throughout the application for enhanced screen reader support (aria-label, aria-live, aria-describedby, role attributes)</li>
            <li><strong className="text-foreground">Keyboard Accessibility:</strong> Full keyboard navigation with visible focus indicators and logical tab order</li>
            <li><strong className="text-foreground">Testing Coverage:</strong> 800+ test identifiers ensuring comprehensive automated accessibility testing</li>
            <li><strong className="text-foreground">Responsive Typography:</strong> Scalable text using relative units that respects user preferences</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">Conformance Status</h2>
          <p className="text-muted-foreground mb-4">
            TypeMasterAI aims to conform to WCAG 2.1 Level AA. Our current conformance status across the four principles:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Perceivable:</strong> We provide text alternatives for non-text content, captions where applicable, and sufficient color contrast</li>
            <li><strong className="text-foreground">Operable:</strong> All functionality is available from a keyboard, users have enough time to read content, and navigation is consistent</li>
            <li><strong className="text-foreground">Understandable:</strong> Text is readable, pages appear and operate in predictable ways, and input assistance is provided</li>
            <li><strong className="text-foreground">Robust:</strong> Content is compatible with current and future assistive technologies through proper markup and ARIA implementation</li>
          </ul>
        </section>

        <section className="bg-amber-500/10 p-6 rounded-lg border border-amber-500/20">
          <h2 className="text-xl font-bold text-foreground mb-3 pb-2 border-b border-amber-500/20">Known Limitations</h2>
          <p className="text-muted-foreground mb-4">
            We are actively working to address the following accessibility limitations:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Visual Typing Tests:</strong> The core typing test experience requires visual input tracking. We are exploring alternative modes and audio feedback for users with visual impairments.</li>
            <li><strong className="text-foreground">Real-time Multiplayer:</strong> Multiplayer racing and live leaderboards currently rely on visual feedback. Enhanced audio cues are planned for future updates.</li>
            <li><strong className="text-foreground">AI-Generated Content:</strong> Some dynamically generated content may not meet all accessibility standards. We continuously monitor and improve AI output quality.</li>
            <li><strong className="text-foreground">Complex Visualizations:</strong> Charts and analytics dashboards may present challenges for screen reader users. Alternative data formats are being developed.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">Compatible Assistive Technologies</h2>
          <p className="text-muted-foreground mb-4">
            TypeMasterAI is designed to be compatible with the following assistive technologies:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Screen readers (NVDA, JAWS, VoiceOver, TalkBack, Narrator)</li>
            <li>Screen magnification software (ZoomText, Windows Magnifier)</li>
            <li>Speech recognition software (Dragon NaturallySpeaking, Windows Speech Recognition)</li>
            <li>Keyboard-only navigation and alternative input devices</li>
            <li>Browser zoom and text scaling features</li>
            <li>High contrast mode and custom color schemes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">Assessment Methods</h2>
          <p className="text-muted-foreground mb-4">
            We assess the accessibility of TypeMasterAI through multiple evaluation methods:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Automated Testing:</strong> Regular scans using axe DevTools, WAVE, and Lighthouse accessibility audits</li>
            <li><strong className="text-foreground">Manual Testing:</strong> Comprehensive keyboard navigation testing across all features</li>
            <li><strong className="text-foreground">Screen Reader Testing:</strong> Regular testing with NVDA, JAWS, and VoiceOver</li>
            <li><strong className="text-foreground">Color Contrast Analysis:</strong> Verification of contrast ratios using specialized tools</li>
            <li><strong className="text-foreground">User Feedback:</strong> Continuous improvement based on accessibility reports from our community</li>
            <li><strong className="text-foreground">Code Reviews:</strong> Accessibility checks integrated into our development workflow</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">Feedback & Contact</h2>
          <p className="text-muted-foreground mb-4">
            We welcome your feedback on the accessibility of TypeMasterAI. Please let us know if you encounter accessibility barriers or have suggestions for improvement.
          </p>
          <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
            <p className="text-muted-foreground mb-4">
              <strong className="text-foreground">Response Time:</strong> We aim to respond to accessibility feedback within 5 business days. Critical accessibility issues are prioritized and addressed as quickly as possible.
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
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">Enforcement & Legal Rights</h2>
          <p className="text-muted-foreground mb-4">
            If you are not satisfied with our response to your accessibility concern, you have the following options:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">India:</strong> Contact the Department of Empowerment of Persons with Disabilities or your local consumer protection authority</li>
            <li><strong className="text-foreground">European Union:</strong> Contact your national equality body or digital accessibility enforcement authority</li>
            <li><strong className="text-foreground">United States:</strong> File a complaint with the Department of Justice under the Americans with Disabilities Act (ADA)</li>
            <li><strong className="text-foreground">Other Regions:</strong> Contact your local disability rights organization or human rights commission</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">Continuous Improvement</h2>
          <p className="text-muted-foreground">
            Accessibility is an ongoing journey, not a destination. We regularly review and update our accessibility practices as standards evolve and new assistive technologies emerge. This statement is reviewed and updated quarterly to reflect our current accessibility status and planned improvements.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 pb-2 border-b border-primary/20">Related Resources</h2>
          <ul className="space-y-2">
            <li>
              <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
              <span className="text-muted-foreground"> - How we protect your personal information</span>
            </li>
            <li>
              <Link href="/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
              <span className="text-muted-foreground"> - Rules for using TypeMasterAI</span>
            </li>
            <li>
              <Link href="/contact" className="text-primary hover:underline">Contact Support</Link>
              <span className="text-muted-foreground"> - General inquiries and technical assistance</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
