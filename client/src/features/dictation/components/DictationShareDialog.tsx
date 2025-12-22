import { useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Twitter, Facebook, MessageCircle, Copy, Check, Link2, Linkedin, Send, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ShareCard } from '@/components/share-card';

interface DictationShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wpm: number;
  accuracy: number;
  errors: number;
  duration?: number; // seconds, optional
  lastResultId: number | null;
  username?: string;
  speedLevel?: string;
  certificateContent?: ReactNode; // Optional: render a certificate preview/content
}

export function DictationShareDialog({
  open,
  onOpenChange,
  wpm,
  accuracy,
  errors,
  duration,
  lastResultId,
  username,
  speedLevel,
  certificateContent,
}: DictationShareDialogProps) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const createShareLink = async () => {
    if (!lastResultId) {
      toast({ title: 'Cannot Share', description: 'No recent dictation result to share. Complete a sentence first.', variant: 'destructive' });
      return;
    }

    try {
      setIsCreatingShare(true);
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: 'dictation', resultId: lastResultId, isAnonymous: false }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create share link');
      }
      const data = await response.json();
      setShareUrl(data.shareUrl);
      toast({ title: 'Share Link Created!', description: 'Your dictation result is ready to share.' });
    } catch (error: any) {
      toast({ title: 'Share Failed', description: error.message || 'Could not create share link. Please try again.', variant: 'destructive' });
    } finally {
      setIsCreatingShare(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!', description: 'Share link copied to clipboard.' });
    } catch {
      toast({ title: 'Copy Failed', description: 'Could not copy link to clipboard.', variant: 'destructive' });
    }
  };

  const getModeDisplay = () => {
    if (typeof duration === 'number' && duration > 0) {
      return duration >= 60 ? `${Math.floor(duration / 60)} min` : `${duration}s`;
    }
    // fallback to speed level if provided
    if (speedLevel) return `${speedLevel}x`;
    return 'Session';
  };

  const ratingEmoji = wpm >= 80 ? '🔥' : wpm >= 60 ? '⚡' : wpm >= 40 ? '🎉' : '🌟';

  const quickShareText = `${ratingEmoji} I just finished a Dictation session on TypeMasterAI!

⚡ Speed: ${wpm} WPM
✨ Accuracy: ${accuracy}%
⏱️ Duration: ${getModeDisplay()}

Can you beat this score? 🚀`;

  const shareTo = (platform: 'twitter' | 'facebook' | 'whatsapp' | 'linkedin' | 'telegram' | 'email') => {
    switch (platform) {
      case 'twitter': {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(quickShareText)}${shareUrl ? `&url=${encodeURIComponent(shareUrl)}` : ''}`;
        window.open(url, '_blank', 'width=600,height=420');
        break;
      }
      case 'facebook': {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl || 'https://typemasterai.com')}&quote=${encodeURIComponent(quickShareText)}`;
        window.open(url, '_blank', 'width=600,height=420');
        break;
      }
      case 'whatsapp': {
        const waText = `*TypeMasterAI Dictation Result*\n\nSpeed: *${wpm} WPM*\nAccuracy: *${accuracy}%*\n${shareUrl ? `\nTry it: ${shareUrl}` : ''}`;
        const url = `https://wa.me/?text=${encodeURIComponent(waText)}`;
        window.open(url, '_blank');
        break;
      }
      case 'linkedin': {
        const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl || 'https://typemasterai.com')}`;
        window.open(url, '_blank', 'width=800,height=600');
        break;
      }
      case 'telegram': {
        const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl || 'https://typemasterai.com')}&text=${encodeURIComponent(quickShareText)}`;
        window.open(url, '_blank', 'width=600,height=400');
        break;
      }
      case 'email': {
        const subject = encodeURIComponent(`My Dictation Result: ${wpm} WPM on TypeMasterAI`);
        const body = encodeURIComponent(`${quickShareText}\n\n${shareUrl || 'https://typemasterai.com'}`);
        window.open(`mailto:?subject=${subject}&body=${body}`);
        break;
      }
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(quickShareText + (shareUrl ? `\n\n${shareUrl}` : ''));
      toast({ title: 'Message Copied!', description: 'Share message copied to clipboard.' });
    } catch {
      toast({ title: 'Copy Failed', description: 'Unable to copy message.', variant: 'destructive' });
    }
  };

  const handleNativeShare = async () => {
    if (!('share' in navigator)) return;
    try {
      await (navigator as any).share({
        title: 'TypeMasterAI - Dictation Result',
        text: quickShareText,
        url: shareUrl || 'https://typemasterai.com',
      });
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Share2 className="w-5 h-5 text-primary" />
            Share Your Achievement
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="quick" data-testid="tab-quick-share">Quick Share</TabsTrigger>
            <TabsTrigger value="card" data-testid="tab-visual-card">Visual Card</TabsTrigger>
            {certificateContent && <TabsTrigger value="certificate" data-testid="tab-certificate">Certificate</TabsTrigger>}
            <TabsTrigger value="challenge" data-testid="tab-challenge">Challenge</TabsTrigger>
          </TabsList>

          {/* Quick Share */}
          <TabsContent value="quick" className="space-y-4">
            <div className="relative">
              <div className="absolute -top-2 left-3 px-2 bg-background text-xs font-medium text-muted-foreground">
                Your Share Message
              </div>
              <div className="p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl border border-primary/20 text-sm leading-relaxed">
                <pre className="whitespace-pre-wrap font-sans text-foreground/90">{quickShareText}</pre>
              </div>
              <button
                onClick={handleCopyMessage}
                className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 transition-colors"
                data-testid="button-copy-message"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => shareTo('twitter')} variant="outline" className="gap-2" data-testid="button-share-twitter">
                <Twitter className="w-4 h-4" /> X (Twitter)
              </Button>
              <Button onClick={() => shareTo('facebook')} variant="outline" className="gap-2" data-testid="button-share-facebook">
                <Facebook className="w-4 h-4" /> Facebook
              </Button>
              <Button onClick={() => shareTo('whatsapp')} variant="outline" className="gap-2" data-testid="button-share-whatsapp">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
              <Button onClick={() => shareTo('linkedin')} variant="outline" className="gap-2" data-testid="button-share-linkedin">
                <Linkedin className="w-4 h-4" /> LinkedIn
              </Button>
              <Button onClick={() => shareTo('telegram')} variant="outline" className="gap-2" data-testid="button-share-telegram">
                <Send className="w-4 h-4" /> Telegram
              </Button>
              <Button onClick={() => shareTo('email')} variant="outline" className="gap-2" data-testid="button-share-email">
                <Mail className="w-4 h-4" /> Email
              </Button>
            </div>

            {/* Permanent Link */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">Permanent Link</p>
              {!shareUrl ? (
                <Button onClick={createShareLink} disabled={isCreatingShare || !lastResultId} className="w-full" variant="secondary" data-testid="button-create-share-link">
                  <Link2 className="w-4 h-4 mr-2" /> {isCreatingShare ? 'Creating...' : 'Create Shareable Link'}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Input value={shareUrl} readOnly className="flex-1" data-testid="input-share-url" />
                  <Button onClick={copyShareLink} variant="outline" size="icon" data-testid="button-copy-link">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              )}
              {'share' in navigator && (
                <Button onClick={handleNativeShare} className="w-full" variant="outline" data-testid="button-native-share">
                  <Share2 className="w-4 h-4 mr-2" /> More Sharing Options
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Visual Card */}
          <TabsContent value="card" className="space-y-4">
            <ShareCard
              wpm={wpm}
              accuracy={accuracy}
              mode={typeof duration === 'number' && duration > 0 ? Math.round(duration) : 60}
              language={'en'}
              username={username}
              consistency={100}
              words={0}
              characters={0}
            />
          </TabsContent>

          {/* Certificate */}
          {certificateContent && (
            <TabsContent value="certificate" className="space-y-4">
              {certificateContent}
            </TabsContent>
          )}

          {/* Challenge (placeholder for parity) */}
          <TabsContent value="challenge" className="space-y-3">
            <div className="p-4 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
              Coming soon: Send a challenge link to your friends to try dictation mode and beat your score!
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
