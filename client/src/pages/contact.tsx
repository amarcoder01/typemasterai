import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto" data-testid="page-contact">
      <div className="mb-16 text-center">
        <h1 className="text-5xl font-bold mb-4" data-testid="heading-contact">Contact Support</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Our support team is here to assist you. Reach out to us through the channels below.
        </p>
      </div>

      <div className="space-y-12 mb-12">
        <section>
          <h2 className="text-3xl font-bold mb-8 pb-3 border-b-2 border-primary/20">
            Contact Channels
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-card/30 p-10 rounded-xl border border-border">
              <h3 className="font-semibold text-2xl mb-4 text-primary">Support</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                Get in touch with our support team for assistance.
              </p>
              <a
                href="mailto:support@typemasterai.com"
                className="text-primary hover:underline font-medium text-xl"
                data-testid="link-email-general"
              >
                support@typemasterai.com
              </a>
            </div>

            <div className="bg-card/30 p-10 rounded-xl border border-border">
              <h3 className="font-semibold text-2xl mb-4 text-primary">Business Inquiries</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                For partnerships and business opportunities.
              </p>
              <a
                href="mailto:business@typemasterai.com"
                className="text-primary hover:underline font-medium text-xl"
                data-testid="link-email-business"
              >
                business@typemasterai.com
              </a>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 p-12 rounded-2xl border border-primary/20">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">Response Time</h2>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              We typically respond to all inquiries within <span className="text-primary font-semibold">24-48 hours</span> during business days.
            </p>
          </div>
        </section>

        <section className="text-center pt-8">
          <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Our team is ready to help you with whatever you need.
          </p>
          <a
            href="mailto:support@typemasterai.com"
            data-testid="link-email-footer"
          >
            <Button size="lg" className="px-12 py-6 text-lg" data-testid="button-contact-support">
              Contact Support
            </Button>
          </a>
        </section>
      </div>
    </div>
  );
}
