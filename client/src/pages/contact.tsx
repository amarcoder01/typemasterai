import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto" data-testid="page-contact">
      <div className="mb-16 text-center">
        <h1 className="text-5xl font-bold mb-4" data-testid="heading-contact">Contact Support</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Our support team is here to help you with any questions or concerns.
        </p>
      </div>

      <div className="space-y-8 mb-12">
        <section>
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-primary/20">
            Contact Channels
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card/30 p-8 rounded-xl border border-border">
              <h3 className="font-semibold text-xl mb-3 text-primary">General Support</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                For general questions, technical support, and account assistance
              </p>
              <a
                href="mailto:support@typemasterai.com"
                className="text-primary hover:underline font-medium text-lg"
                data-testid="link-email-general"
              >
                support@typemasterai.com
              </a>
            </div>

            <div className="bg-card/30 p-8 rounded-xl border border-border">
              <h3 className="font-semibold text-xl mb-3 text-primary">Business & Partnerships</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                For partnerships, collaborations, and business opportunities
              </p>
              <a
                href="mailto:business@typemasterai.com"
                className="text-primary hover:underline font-medium text-lg"
                data-testid="link-email-business"
              >
                business@typemasterai.com
              </a>
            </div>
          </div>
        </section>

        <section className="bg-card/30 p-10 rounded-2xl border border-border">
          <h2 className="text-2xl font-bold mb-6">What We Can Help With</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-3 text-primary">Technical Support</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span>Account and login issues</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span>Bug reports and technical problems</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span>Feature troubleshooting</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span>Browser compatibility issues</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3 text-primary">General Inquiries</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span>Privacy and data protection questions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span>Feature requests and suggestions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span>Language and content feedback</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-1">•</span>
                  <span>Legal and compliance matters</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 p-10 rounded-2xl border border-primary/20">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Response Time</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              We typically respond to all inquiries within <span className="text-primary font-semibold">24-48 hours</span> during business days (Monday to Friday).
              For urgent matters, please include "URGENT" in your email subject line.
            </p>
          </div>
        </section>

        <section className="bg-card/20 p-10 rounded-xl border border-border/50">
          <h2 className="text-2xl font-bold mb-4">Before Contacting Us</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            To help us serve you better and receive a faster response, please include the following information in your email:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-card/30 rounded-lg border border-border/50">
              <h3 className="font-semibold mb-2">For Technical Issues:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Your browser and version</li>
                <li>• Operating system</li>
                <li>• Steps to reproduce the issue</li>
                <li>• Screenshots if applicable</li>
              </ul>
            </div>
            <div className="p-4 bg-card/30 rounded-lg border border-border/50">
              <h3 className="font-semibold mb-2">For Account Issues:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Your account email address</li>
                <li>• Description of the problem</li>
                <li>• When the issue started</li>
                <li>• Any error messages received</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="text-center pt-8">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Help?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Our support team is standing by to assist you.
          </p>
          <a
            href="mailto:support@typemasterai.com"
            data-testid="link-email-footer"
          >
            <Button size="lg" className="px-10 py-6 text-lg" data-testid="button-contact-support">
              Contact Support Team
            </Button>
          </a>
        </section>
      </div>
    </div>
  );
}
