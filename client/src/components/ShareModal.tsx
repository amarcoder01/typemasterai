import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Share2, Twitter, Facebook, MessageCircle, Copy, Check } from 'lucide-react';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: string;
  wpm: number;
  accuracy: number;
  errors: number;
  duration?: number;
  characters?: number;
  metadata?: Record<string, any>;
  isAnonymous?: boolean;
}

export function ShareModal({ 
  open, 
  onOpenChange, 
  mode,
  wpm,
  accuracy,
  errors,
  duration,
  characters,
  metadata,
  isAnonymous = false
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const createShare = async () => {
    try {
      setIsCreating(true);
      
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode,
          wpm,
          accuracy,
          errors,
          duration,
          characters,
          metadata,
          isAnonymous
        }),
      });

      if (!response.ok) throw new Error('Failed to create share');

      const data = await response.json();
      setShareUrl(data.shareUrl);
      
      toast({
        title: 'Share link created!',
        description: 'Your result is ready to share',
      });
    } catch (error) {
      console.error('Create share error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create share link',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard',
      });
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const shareToTwitter = () => {
    if (!shareUrl) return;
    
    const text = `I just scored ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI! Can you beat me? 🚀`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareToFacebook = () => {
    if (!shareUrl) return;
    
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };

  const shareToWhatsApp = () => {
    if (!shareUrl) return;
    
    const text = `I just scored ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI! Can you beat me? ${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TypeMasterAI - My Typing Result',
          text: `I just scored ${wpm} WPM with ${accuracy}% accuracy!`,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Native share error:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Your Result
          </DialogTitle>
          <DialogDescription>
            Share your typing achievement with friends and challenge them to beat your score!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareUrl ? (
            <div className="text-center py-6">
              <div className="mb-4">
                <div className="text-4xl font-bold text-primary mb-2">{wpm} WPM</div>
                <div className="text-sm text-muted-foreground">
                  {accuracy}% accuracy • {errors} errors
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Mode: {mode}
                </div>
              </div>
              
              <Button 
                onClick={createShare} 
                disabled={isCreating}
                size="lg"
                className="w-full"
                data-testid="button-create-share"
              >
                {isCreating ? 'Creating...' : 'Create Share Link'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly
                  className="flex-1"
                  data-testid="input-share-url"
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="icon"
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={shareToTwitter}
                  variant="outline"
                  className="w-full"
                  data-testid="button-share-twitter"
                >
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  onClick={shareToFacebook}
                  variant="outline"
                  className="w-full"
                  data-testid="button-share-facebook"
                >
                  <Facebook className="w-4 h-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  onClick={shareToWhatsApp}
                  variant="outline"
                  className="w-full"
                  data-testid="button-share-whatsapp"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>

              {navigator.share && (
                <Button
                  onClick={handleNativeShare}
                  variant="secondary"
                  className="w-full"
                  data-testid="button-share-native"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share via...
                </Button>
              )}

              <p className="text-xs text-center text-muted-foreground">
                This link has been viewed {0} times
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
