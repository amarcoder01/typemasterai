import { Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto" data-testid="page-contact">
      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-5xl font-bold mb-4" data-testid="heading-contact">Get in Touch</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Have questions, feedback, or suggestions? We'd love to hear from you!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="space-y-6">
          <div className="bg-card/30 p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">General Inquiries</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              For general questions and information about TypeMasterAI
            </p>
            <a
              href="mailto:hello@typemasterai.com"
              className="text-primary hover:underline flex items-center gap-2"
              data-testid="link-email-general"
            >
              hello@typemasterai.com
              <Send className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-card/30 p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Support</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              Need help with your account or experiencing technical issues?
            </p>
            <a
              href="mailto:support@typemasterai.com"
              className="text-primary hover:underline flex items-center gap-2"
              data-testid="link-email-support"
            >
              support@typemasterai.com
              <Send className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-card/30 p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Privacy & Legal</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              Questions about privacy, data protection, or legal matters
            </p>
            <a
              href="mailto:legal@typemasterai.com"
              className="text-primary hover:underline flex items-center gap-2"
              data-testid="link-email-legal"
            >
              legal@typemasterai.com
              <Send className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-card/30 p-6 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Business & Partnerships</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              Interested in partnerships, collaborations, or business opportunities?
            </p>
            <a
              href="mailto:business@typemasterai.com"
              className="text-primary hover:underline flex items-center gap-2"
              data-testid="link-email-business"
            >
              business@typemasterai.com
              <Send className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card/30 p-8 rounded-xl border border-border">
            <h3 className="font-semibold text-xl mb-4">Feedback & Suggestions</h3>
            <p className="text-muted-foreground mb-4">
              We're constantly improving TypeMasterAI based on user feedback. Your ideas help shape the future of our platform!
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Feature requests and improvement ideas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Bug reports and technical issues</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Language and content suggestions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>User experience feedback</span>
              </li>
            </ul>
            <a href="mailto:feedback@typemasterai.com" data-testid="link-email-feedback">
              <Button className="w-full" data-testid="button-send-feedback">
                <Mail className="w-4 h-4 mr-2" />
                Send Feedback
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="bg-card/20 p-8 rounded-xl border border-border text-center">
        <h3 className="font-semibold text-xl mb-3">Response Time</h3>
        <p className="text-muted-foreground">
          We typically respond to all inquiries within <span className="text-primary font-semibold">24-48 hours</span> during business days.
          For urgent matters, please mark your email as "Urgent" in the subject line.
        </p>
      </div>
    </div>
  );
}
