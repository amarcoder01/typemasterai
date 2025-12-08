import { Link } from "wouter";
import { Accessibility, Eye, Keyboard, Volume2, Monitor, Mail, ExternalLink } from "lucide-react";

export default function AccessibilityStatement() {
  return (
    <div className="max-w-4xl mx-auto" data-testid="page-accessibility">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Accessibility className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold" data-testid="heading-accessibility">Accessibility Statement</h1>
            <p className="text-muted-foreground text-sm mt-1">Last Updated: December 8, 2025</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          TypeMasterAI is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.
        </p>
      </div>

      <div className="space-y-8 prose prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Our Commitment</h2>
          <p className="text-muted-foreground">
            We believe that typing practice should be accessible to everyone, regardless of ability. TypeMasterAI strives to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. These guidelines explain how to make web content more accessible for people with disabilities and more user-friendly for everyone.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Accessibility Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-primary" />
                Keyboard Navigation
              </h3>
              <p className="text-sm text-muted-foreground">
                All interactive elements can be accessed using keyboard navigation. Use Tab to move forward, Shift+Tab to move backward, and Enter/Space to activate.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Visual Contrast
              </h3>
              <p className="text-sm text-muted-foreground">
                We maintain a minimum 4.5:1 contrast ratio for normal text and 3:1 for large text, ensuring readability for users with visual impairments.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-primary" />
                Screen Reader Support
              </h3>
              <p className="text-sm text-muted-foreground">
                Our platform is compatible with popular screen readers including NVDA, JAWS, and VoiceOver. We use semantic HTML and ARIA labels for enhanced accessibility.
              </p>
            </div>
            <div className="bg-card/30 p-4 rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                Responsive Design
              </h3>
              <p className="text-sm text-muted-foreground">
                TypeMasterAI works across devices of all sizes. Text can be resized up to 200% without loss of functionality, and content reflows appropriately.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Conformance Status</h2>
          <p className="text-muted-foreground mb-4">
            TypeMasterAI aims to conform to WCAG 2.1 Level AA. Our current conformance status:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Perceivable:</strong> We provide text alternatives for non-text content, captions where applicable, and sufficient color contrast</li>
            <li><strong className="text-foreground">Operable:</strong> All functionality is available from a keyboard, users have enough time to read content, and navigation is consistent</li>
            <li><strong className="text-foreground">Understandable:</strong> Text is readable, pages appear and operate in predictable ways, and input assistance is provided</li>
            <li><strong className="text-foreground">Robust:</strong> Content is compatible with current and future assistive technologies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Known Limitations</h2>
          <p className="text-muted-foreground mb-4">
            We are actively working to address the following accessibility limitations:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Typing Tests:</strong> The core typing test experience requires visual input tracking. We are exploring alternative modes for users with visual impairments.</li>
            <li><strong className="text-foreground">Real-time Features:</strong> Multiplayer racing and live leaderboards rely on visual feedback. Audio cues are planned for future updates.</li>
            <li><strong className="text-foreground">Third-party Content:</strong> Some AI-generated content may not meet all accessibility standards.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Assistive Technologies</h2>
          <p className="text-muted-foreground mb-4">
            TypeMasterAI is designed to be compatible with the following assistive technologies:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Screen readers (NVDA, JAWS, VoiceOver, TalkBack)</li>
            <li>Screen magnification software</li>
            <li>Speech recognition software</li>
            <li>Keyboard-only navigation</li>
            <li>Browser zoom and text scaling</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Technical Specifications</h2>
          <p className="text-muted-foreground mb-4">
            Accessibility of TypeMasterAI relies on the following technologies:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>HTML5</li>
            <li>WAI-ARIA (Accessible Rich Internet Applications)</li>
            <li>CSS (Cascading Style Sheets)</li>
            <li>JavaScript</li>
          </ul>
          <p className="text-muted-foreground mt-4">
            These technologies are relied upon for conformance with WCAG 2.1 Level AA.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Assessment Methods</h2>
          <p className="text-muted-foreground mb-4">
            We assess the accessibility of TypeMasterAI through:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Self-evaluation using accessibility testing tools (axe DevTools, WAVE)</li>
            <li>Manual keyboard navigation testing</li>
            <li>Screen reader testing with NVDA and VoiceOver</li>
            <li>Color contrast analysis</li>
            <li>User feedback and accessibility reports</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Feedback & Contact</h2>
          <p className="text-muted-foreground mb-4">
            We welcome your feedback on the accessibility of TypeMasterAI. Please let us know if you encounter accessibility barriers:
          </p>
          <div className="bg-card/30 p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Mail className="w-4 h-4 text-primary" />
              <a href="mailto:support@typemasterai.com" className="text-primary hover:underline">
                support@typemasterai.com
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              We try to respond to accessibility feedback within 5 business days.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Enforcement Procedure</h2>
          <p className="text-muted-foreground">
            If you are not satisfied with our response to your accessibility concern, you may contact your local disability rights organization or regulatory body. In the EU, you may contact your national equality body. In the US, you may file a complaint with the Department of Justice.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Additional Resources</h2>
          <ul className="space-y-2">
            <li>
              <a 
                href="https://www.w3.org/WAI/standards-guidelines/wcag/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Web Content Accessibility Guidelines (WCAG)
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a 
                href="https://www.ada.gov/resources/web-guidance/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                ADA Web Accessibility Guidance
                <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <Link href="/contact" className="text-primary hover:underline">Contact Us</Link>
              <span className="text-muted-foreground"> - General inquiries and support</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
