import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Share2, Twitter, Facebook, MessageCircle, Copy, Check, Link2, 
  Linkedin, Send, Mail, Award 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ShareCard } from '@/components/share-card';
import { CertificateGenerator } from '@/components/certificate-generator';

interface DictationShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wpm: number;
  accuracy: number;
  errors: number;
  duration?: number; // seconds
  consistency?: number;
  totalWords?: number;
  totalCharacters?: number;
  lastResultId: number | null;
  username?: string;
  speedLevel?: string;
  verificationId?: string;
  // Certificate functions
  onViewCertificate?: () => void;
  onCopyCertificateImage?: () => void;
  onShareCertificateWithImage?: () => void;
  isCopying?: boolean;
  isSharing?: boolean;
  // Hidden certificate for pre-rendering
  showHiddenCertificate?: boolean;
}

// Performance rating matching standard mode
function getPerformanceRating(wpm: number, accuracy: number) {
  if (wpm >= 100 && accuracy >= 98) return { emoji: "🏆", title: "Legendary Typist", badge: "Diamond", color: "#b9f2ff" };
  if (wpm >= 80 && accuracy >= 95) return { emoji: "⚡", title: "Speed Demon", badge: "Platinum", color: "#e5e4e2" };
  if (wpm >= 60 && accuracy >= 90) return { emoji: "🔥", title: "Fast & Accurate", badge: "Gold", color: "#ffd700" };
  if (wpm >= 40 && accuracy >= 85) return { emoji: "💪", title: "Solid Performer", badge: "Silver", color: "#c0c0c0" };
  return { emoji: "🎯", title: "Rising Star", badge: "Bronze", color: "#cd7f32" };
}

export function DictationShareDialog({
  open,
  onOpenChange,
  wpm,
  accuracy,
  errors,
  duration = 60,
  consistency = 100,
  totalWords = 0,
  totalCharacters = 0,
  lastResultId,
  username,
  speedLevel = '1.0',
  verificationId,
  onViewCertificate,
  onCopyCertificateImage,
  onShareCertificateWithImage,
  isCopying = false,
  isSharing = false,
  showHiddenCertificate = true,
}: DictationShareDialogProps) {
  const { toast } = useToast();
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const rating = getPerformanceRating(wpm, accuracy);
  const modeDisplay = duration >= 60 ? `${Math.floor(duration / 60)} minute` : `${duration}s`;
  
  const trackShare = (platform: string) => {
    // Analytics tracking placeholder
    console.log(`[Share] Dictation shared to ${platform}`);
  };
  
  const createShareLink = async () => {
    if (!lastResultId) {
      toast({ title: 'Cannot Share', description: 'No recent dictation result to share.', variant: 'destructive' });
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
      toast({ title: 'Share Failed', description: error.message || 'Could not create share link.', variant: 'destructive' });
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
      toast({ title: 'Copy Failed', description: 'Could not copy link.', variant: 'destructive' });
    }
  };
  
  const shareToSocial = (platform: string) => {
    const text = `${rating.emoji} New Dictation Record: ${wpm} WPM!\n\n⚡ Speed: ${wpm} Words Per Minute\n✨ Accuracy: ${accuracy}%\n🏆 Level: ${rating.title}\n🎯 Badge: ${rating.badge}\n⏱️ Mode: Dictation\n\nCan you beat this score? Take the challenge! 🚀\n\n👉 https://typemasterai.com\n\n#TypingSpeed #TypeMasterAI #Dictation #WPM`;
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com')}&quote=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
        break;
      case 'whatsapp':
        const waText = `*TypeMasterAI Dictation*\n\nSpeed: *${wpm} WPM*\nAccuracy: *${accuracy}%*\n\nTry it: https://typemasterai.com`;
        window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
        break;
    }
    trackShare(`quick_${platform}`);
  };
  
  const handleNativeShare = async () => {
    if (!('share' in navigator)) return;
    try {
      await (navigator as any).share({
        title: 'TypeMasterAI - Dictation Result',
        text: `${rating.emoji} ${wpm} WPM with ${accuracy}% accuracy in Dictation Mode!`,
        url: shareUrl || 'https://typemasterai.com',
      });
      trackShare('native');
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
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-400 text-sm font-medium rounded-full border border-purple-500/30">
              🎧 Dictation Mode
            </span>
            <span className="text-xs text-muted-foreground">(Listen & Type)</span>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="quick" data-testid="tab-quick-share">Quick Share</TabsTrigger>
            <TabsTrigger value="card" data-testid="tab-visual-card">Visual Card</TabsTrigger>
            {username && <TabsTrigger value="certificate" data-testid="tab-certificate">Certificate</TabsTrigger>}
            <TabsTrigger value="challenge" data-testid="tab-challenge">Challenge</TabsTrigger>
          </TabsList>
          
          {/* Quick Share Tab */}
          <TabsContent value="quick" className="space-y-4">
            {/* Pre-composed Share Message Preview */}
            <div className="relative">
              <div className="absolute -top-2 left-3 px-2 bg-background text-xs font-medium text-muted-foreground">
                Your Share Message
              </div>
              <div className="p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl border border-primary/20 text-sm leading-relaxed">
                <div className="space-y-2">
                  <p className="text-base font-medium">
                    {rating.emoji} New Dictation Mode Record: <span className="text-primary font-bold">{wpm} WPM</span>!
                  </p>
                  <p className="text-muted-foreground">
                    ⚡ Speed: <span className="text-foreground font-semibold">{wpm} WPM (Words Per Minute)</span>
                  </p>
                  <p className="text-muted-foreground">
                    ✨ Accuracy: <span className="text-foreground font-semibold">{accuracy}% (Precision Rate)</span>
                  </p>
                  <p className="text-muted-foreground">
                    🏆 Level: <span className="text-yellow-400 font-semibold">{rating.title}</span>
                  </p>
                  <p className="text-muted-foreground">
                    🎯 Badge: <span className="text-foreground font-semibold">{rating.badge}</span>
                  </p>
                  <p className="text-muted-foreground">
                    🎧 Mode: <span className="text-purple-400 font-semibold">Dictation Mode</span> <span className="text-xs">(Listen & Type)</span>
                  </p>
                  <p className="text-primary/80 text-xs mt-3 font-medium">
                    Can you beat this score? Take the challenge! 🚀
                  </p>
                  <p className="text-xs text-primary mt-2 font-medium">
                    👉 https://typemasterai.com
                  </p>
                  <p className="text-xs text-muted-foreground">
                    #TypingSpeed #TypeMasterAI #DictationMode #WPM
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const text = `${rating.emoji} New Dictation Mode Record: ${wpm} WPM (Words Per Minute)!\n\n⚡ Speed: ${wpm} WPM (Words Per Minute)\n✨ Accuracy: ${accuracy}% (Precision Rate)\n🏆 Level: ${rating.title}\n🎯 Badge: ${rating.badge}\n🎧 Mode: Dictation Mode (Listen & Type)\n\nCan you beat this score? Take the challenge! 🚀\n\n👉 https://typemasterai.com\n\n#TypingSpeed #TypeMasterAI #DictationMode #WPM`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "Message Copied!", description: "Share message copied to clipboard" });
                }}
                className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 transition-colors"
                data-testid="button-copy-message"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Quick Share Buttons */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
                Click to Share Instantly
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => shareToSocial('twitter')}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                  data-testid="button-share-twitter"
                >
                  <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                  <span className="text-xs font-medium">X (Twitter)</span>
                </button>
                <button
                  onClick={() => shareToSocial('facebook')}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
                  data-testid="button-share-facebook"
                >
                  <Facebook className="w-4 h-4 text-[#1877F2]" />
                  <span className="text-xs font-medium">Facebook</span>
                </button>
                <button
                  onClick={() => shareToSocial('linkedin')}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all"
                  data-testid="button-share-linkedin"
                >
                  <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                  <span className="text-xs font-medium">LinkedIn</span>
                </button>
                <button
                  onClick={() => shareToSocial('whatsapp')}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
                  data-testid="button-share-whatsapp"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span className="text-xs font-medium">WhatsApp</span>
                </button>
                <button
                  onClick={() => {
                    const title = encodeURIComponent(`${rating.emoji} Hit ${wpm} WPM in Dictation Mode - What's your typing speed?`);
                    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent('https://typemasterai.com')}&title=${title}`, '_blank', 'width=600,height=600');
                    trackShare('quick_reddit');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/25 border border-[#FF4500]/20 transition-all"
                  data-testid="button-share-reddit"
                >
                  <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                  </svg>
                  <span className="text-xs font-medium">Reddit</span>
                </button>
                <button
                  onClick={() => {
                    const text = `${rating.emoji} Just hit ${wpm} WPM (${accuracy}% accuracy) in Dictation Mode!\n\n🏆 ${rating.title} | ${rating.badge} Badge\n\nCan you beat it? 🎯`;
                    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com')}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
                    trackShare('quick_telegram');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
                  data-testid="button-share-telegram"
                >
                  <Send className="w-4 h-4 text-[#0088cc]" />
                  <span className="text-xs font-medium">Telegram</span>
                </button>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent(`${rating.emoji} My TypeMasterAI Dictation Result: ${wpm} WPM!`);
                    const body = encodeURIComponent(`Hi there!\n\nI just completed a dictation test on TypeMasterAI:\n\n📊 MY RESULTS:\n━━━━━━━━━━━━━━━\n⚡ Typing Speed: ${wpm} WPM\n✨ Accuracy: ${accuracy}%\n🏆 Performance: ${rating.title}\n🎯 Badge: ${rating.badge}\n🎧 Mode: Dictation\n\nWant to test your typing speed? It's fun and you might be surprised!\n\n👉 Try it: https://typemasterai.com\n\nCheers!`);
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                    trackShare('quick_email');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
                  data-testid="button-share-email"
                >
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium">Email</span>
                </button>
              </div>
            </div>
            
            {/* Shareable Link */}
            {username && lastResultId && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
                  Permanent Link
                </p>
                {!shareUrl ? (
                  <button
                    onClick={createShareLink}
                    disabled={isCreatingShare}
                    className="w-full py-2.5 bg-primary/10 text-primary font-medium rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 border border-primary/20"
                    data-testid="button-create-share-link"
                  >
                    <Link2 className="w-4 h-4" />
                    {isCreatingShare ? "Creating..." : "Create Shareable Link"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-muted/50 border rounded-lg text-sm font-mono"
                      data-testid="input-share-url"
                    />
                    <button
                      onClick={copyShareLink}
                      className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                      data-testid="button-copy-link"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Native Share */}
            {'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full py-3 bg-gradient-to-r from-primary/10 to-purple-500/10 text-foreground font-medium rounded-xl hover:from-primary/20 hover:to-purple-500/20 transition-all flex items-center justify-center gap-2 border border-primary/20"
                data-testid="button-native-share"
              >
                <Share2 className="w-4 h-4" />
                More Sharing Options
              </button>
            )}
          </TabsContent>
          
          {/* Certificate Tab */}
          {username && (
            <TabsContent value="certificate" className="space-y-4">
              <div className="text-center space-y-2 mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 mb-2">
                  <Award className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-lg font-bold">Share Your Certificate</h3>
                <p className="text-sm text-muted-foreground">
                  Show off your official TypeMasterAI Dictation Certificate!
                </p>
              </div>
              
              {/* Certificate Stats Preview */}
              <div className="p-4 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-purple-500/10 rounded-xl border border-yellow-500/20">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Typing Speed</p>
                    <p className="text-2xl font-bold text-primary">{wpm}</p>
                    <p className="text-xs text-muted-foreground">WPM (Words Per Minute)</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                    <p className="text-2xl font-bold text-green-400">{accuracy}%</p>
                    <p className="text-xs text-muted-foreground">ACC (Precision Rate)</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Performance</p>
                    <p className="text-sm font-bold text-yellow-400">{rating.badge}</p>
                    <p className="text-xs text-muted-foreground">Badge Earned</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mode</p>
                    <p className="text-sm font-bold text-purple-400">🎧 Dictation</p>
                    <p className="text-xs text-muted-foreground">Listen & Type</p>
                  </div>
                </div>
              </div>
              
              {/* Hidden pre-rendered certificate */}
              {showHiddenCertificate && (
                <div className="absolute -z-50 w-0 h-0 overflow-hidden opacity-0 pointer-events-none" aria-hidden="true">
                  <CertificateGenerator
                    username={username}
                    wpm={wpm}
                    accuracy={accuracy}
                    mode={duration}
                    date={new Date()}
                    freestyle={false}
                    characters={totalCharacters}
                    words={totalWords}
                    consistency={consistency}
                    verificationId={verificationId}
                    modeLabel="Dictation Mode"
                  />
                </div>
              )}
              
              {/* View & Share Certificate Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onViewCertificate}
                  className="py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                  data-testid="button-view-certificate-share"
                >
                  <Award className="w-5 h-5" />
                  View Certificate
                </button>
                <button
                  onClick={onCopyCertificateImage}
                  className="py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
                  data-testid="button-copy-certificate-image"
                >
                  {isCopying ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {isCopying ? "Copied!" : "Copy Image"}
                </button>
              </div>
              
              {/* Share Certificate with Image Button */}
              {'share' in navigator && (
                <button
                  onClick={onShareCertificateWithImage}
                  disabled={isSharing}
                  className="w-full py-4 bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-share-certificate-with-image"
                >
                  <Share2 className="w-5 h-5" />
                  {isSharing ? "Preparing..." : "Share Certificate with Image"}
                </button>
              )}
              
              {/* Certificate Share Message Preview */}
              <div className="relative">
                <div className="absolute -top-2 left-3 px-2 bg-background text-xs font-medium text-muted-foreground">
                  Certificate Share Message
                </div>
                <div className="p-4 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-xl border border-yellow-500/20 text-sm leading-relaxed">
                  <div className="space-y-2">
                    <p className="text-base font-medium">
                      🎓 <span className="text-yellow-400 font-bold">CERTIFIED: {wpm} WPM Dictation!</span>
                    </p>
                    <p className="text-muted-foreground">
                      ⚡ Speed: <span className="text-foreground font-semibold">{wpm} WPM</span>
                    </p>
                    <p className="text-muted-foreground">
                      ✨ Accuracy: <span className="text-foreground font-semibold">{accuracy}%</span>
                    </p>
                    <p className="text-muted-foreground">
                      🏆 Level: <span className="text-yellow-400 font-semibold">{rating.title}</span>
                    </p>
                    <p className="text-muted-foreground">
                      🎧 Mode: <span className="text-foreground font-semibold">Dictation</span>
                    </p>
                    <p className="text-primary/80 text-xs mt-3 font-medium">
                      Official dictation certificate earned! Get yours 👇
                    </p>
                    <p className="text-xs text-primary mt-2 font-medium">
                      🔗 https://typemasterai.com
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #TypeMasterAI #DictationCertificate #TypingSkills #Certified
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const text = `🎓 Just earned my TypeMasterAI Dictation Certificate! ${wpm} WPM with ${accuracy}% accuracy 🎯\n\nOfficial certificate unlocked!\n\n🔗 https://typemasterai.com\n\n#TypeMasterAI #Certified`;
                    navigator.clipboard.writeText(text);
                    toast({ title: "Certificate Message Copied!", description: "Paste into your social media post" });
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 transition-colors"
                  data-testid="button-copy-cert-message"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              
              {/* Certificate Social Share Buttons */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
                  Share Certificate On
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      const text = encodeURIComponent(`🎓 Just earned my TypeMasterAI Dictation Certificate! ${wpm} WPM with ${accuracy}% accuracy 🎯\n\n#TypeMasterAI #Certified`);
                      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                      trackShare('certificate_twitter');
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                    data-testid="button-cert-share-twitter"
                  >
                    <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                    <span className="text-xs font-medium">X (Twitter)</span>
                  </button>
                  <button
                    onClick={() => {
                      const text = encodeURIComponent(`🎓 I just earned my official TypeMasterAI Dictation Certificate!\n\nAchieved ${wpm} WPM with ${accuracy}% accuracy! 🎯\n\nReady to earn yours? 🚀`);
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com')}&quote=${text}`, '_blank', 'width=600,height=400');
                      trackShare('certificate_facebook');
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
                    data-testid="button-cert-share-facebook"
                  >
                    <Facebook className="w-4 h-4 text-[#1877F2]" />
                    <span className="text-xs font-medium">Facebook</span>
                  </button>
                  <button
                    onClick={() => {
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                      trackShare('certificate_linkedin');
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all"
                    data-testid="button-cert-share-linkedin"
                  >
                    <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                    <span className="text-xs font-medium">LinkedIn</span>
                  </button>
                  <button
                    onClick={() => {
                      const waText = `*TypeMasterAI Dictation Certificate*\n\nSpeed: *${wpm} WPM*\nAccuracy: *${accuracy}%*\nLevel: ${rating.title}\n\nGet yours: https://typemasterai.com`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
                      trackShare('certificate_whatsapp');
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
                    data-testid="button-cert-share-whatsapp"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    <span className="text-xs font-medium">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => {
                      const text = `🎓 CERTIFIED!\n\n⚡ ${wpm} WPM | ✨ ${accuracy}% Accuracy\n🏆 ${rating.title} | 🎧 Dictation Mode\n\nJust earned my official TypeMasterAI Certificate! 😎`;
                      window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com')}&text=${encodeURIComponent(text)}`, '_blank');
                      trackShare('certificate_telegram');
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
                    data-testid="button-cert-share-telegram"
                  >
                    <Send className="w-4 h-4 text-[#0088cc]" />
                    <span className="text-xs font-medium">Telegram</span>
                  </button>
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(`🎓 TypeMasterAI Dictation Certificate | ${wpm} WPM`);
                      const body = encodeURIComponent(`Hello!\n\nI've earned an official TypeMasterAI Dictation Certificate!\n\n📜 CERTIFICATE DETAILS:\n━━━━━━━━━━━━━━━━━━━━\n⚡ Typing Speed: ${wpm} WPM\n✨ Accuracy: ${accuracy}%\n🏆 Level: ${rating.title}\n🎧 Mode: Dictation\n📅 Date: ${new Date().toLocaleDateString()}\n\n👉 Get certified: https://typemasterai.com\n\nBest regards!`);
                      window.open(`mailto:?subject=${subject}&body=${body}`);
                      trackShare('certificate_email');
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
                    data-testid="button-cert-share-email"
                  >
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium">Email</span>
                  </button>
                </div>
              </div>
              
              {/* Certificate Sharing Tips */}
              <div className="space-y-2">
                <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-xs text-center text-muted-foreground">
                    📱 <span className="font-medium text-foreground">Mobile:</span> Use "Share Certificate with Image" to attach the certificate directly!
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                  <p className="text-xs text-center text-muted-foreground">
                    💻 <span className="font-medium text-foreground">Desktop:</span> Use "Copy Image" then paste directly into Twitter, LinkedIn, Discord, or any social media!
                  </p>
                </div>
              </div>
            </TabsContent>
          )}
          
          {/* Visual Card Tab */}
          <TabsContent value="card" className="space-y-4">
            {/* Mode indicator for Visual Card */}
            <div className="text-center pb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full border border-purple-500/30">
                🎧 Dictation Mode
              </span>
            </div>
            <ShareCard
              wpm={wpm}
              accuracy={accuracy}
              mode={duration || 60}
              language="en"
              username={username}
              freestyle={false}
              consistency={consistency}
              words={totalWords}
              characters={totalCharacters}
              onShareTracked={trackShare}
              modeLabel="Dictation Mode"
            />
          </TabsContent>
          
          {/* Challenge Tab */}
          <TabsContent value="challenge" className="space-y-4">
            <div className="text-center space-y-2 mb-4">
              <div className="text-4xl">🎯</div>
              <h3 className="text-lg font-bold">Challenge a Friend</h3>
              <p className="text-sm text-muted-foreground">
                Send a personalized dictation challenge and see if they can beat your score!
              </p>
            </div>
            
            {/* Challenge Info Box */}
            <div className="p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
              <p className="text-xs text-center text-muted-foreground">
                🎧 <span className="font-medium text-foreground">Dictation Mode:</span> Listen to the sentence, then type what you hear. 
                Test your listening and typing skills simultaneously!
              </p>
            </div>

            {/* Challenge Link Generator */}
            <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
              <div className="text-center mb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Score to Beat</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Typing Speed:</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">{wpm}</span>
                    <span className="text-xs text-muted-foreground ml-1">WPM (Words Per Minute)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Accuracy:</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-400">{accuracy}%</span>
                    <span className="text-xs text-muted-foreground ml-1">ACC (Precision)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Mode:</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-purple-400">🎧 Dictation Mode</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Performance:</span>
                  <div className="text-right">
                    <span className="text-lg font-bold" style={{ color: rating.color }}>{rating.badge} Badge</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Challenge Description */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-sm text-center text-muted-foreground">
                📢 <span className="font-medium text-foreground">How it works:</span> Your friend will try to beat your score in Dictation Mode. 
                They'll hear sentences spoken aloud and must type them accurately. May the fastest typist win! 🏆
              </p>
            </div>
            
            {/* Challenge Share Buttons */}
            <div className="space-y-2">
              <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">
                Send Challenge Via
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    const text = encodeURIComponent(`${rating.emoji} I just hit ${wpm} WPM in Dictation Mode! Can you beat my score? 🎯\n\nChallenge accepted?\n\n#TypeMasterAI #Challenge`);
                    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                    trackShare('challenge_twitter');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
                  data-testid="button-challenge-twitter"
                >
                  <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                  <span className="text-xs font-medium">X (Twitter)</span>
                </button>
                <button
                  onClick={() => {
                    const text = encodeURIComponent(`🎯 Dictation Challenge!\n\nI scored ${wpm} WPM with ${accuracy}% accuracy in Dictation Mode! ${rating.emoji}\n\nDo you accept the challenge? 😏🔥`);
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com')}&quote=${text}`, '_blank', 'width=600,height=400');
                    trackShare('challenge_facebook');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
                  data-testid="button-challenge-facebook"
                >
                  <Facebook className="w-4 h-4 text-[#1877F2]" />
                  <span className="text-xs font-medium">Facebook</span>
                </button>
                <button
                  onClick={() => {
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
                    trackShare('challenge_linkedin');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all"
                  data-testid="button-challenge-linkedin"
                >
                  <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                  <span className="text-xs font-medium">LinkedIn</span>
                </button>
                <button
                  onClick={() => {
                    const waChallenge = `*TypeMasterAI Dictation Challenge*\n\nMy Score: *${wpm} WPM*\nAccuracy: *${accuracy}%*\nMode: Dictation\nBadge: ${rating.badge}\n\nBeat my score: https://typemasterai.com`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(waChallenge)}`, '_blank');
                    trackShare('challenge_whatsapp');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
                  data-testid="button-challenge-whatsapp"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span className="text-xs font-medium">WhatsApp</span>
                </button>
                <button
                  onClick={() => {
                    const title = encodeURIComponent(`I challenge you to beat my ${wpm} WPM in Dictation Mode!`);
                    window.open(`https://www.reddit.com/submit?url=${encodeURIComponent('https://typemasterai.com')}&title=${title}`, '_blank', 'width=600,height=600');
                    trackShare('challenge_reddit');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/25 border border-[#FF4500]/20 transition-all"
                  data-testid="button-challenge-reddit"
                >
                  <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                  </svg>
                  <span className="text-xs font-medium">Reddit</span>
                </button>
                <button
                  onClick={() => {
                    const text = `🎯 DICTATION CHALLENGE!\n\n${rating.emoji} Can you beat my ${wpm} WPM with ${accuracy}% accuracy?\n\nAccept the challenge:`;
                    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com')}&text=${encodeURIComponent(text)}`, '_blank');
                    trackShare('challenge_telegram');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
                  data-testid="button-challenge-telegram"
                >
                  <Send className="w-4 h-4 text-[#0088cc]" />
                  <span className="text-xs font-medium">Telegram</span>
                </button>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent(`🎯 Dictation Challenge: Can you beat my ${wpm} WPM?`);
                    const body = encodeURIComponent(`Hey!\n\n🎯 I CHALLENGE YOU!\n\n${rating.emoji} Can you beat my dictation score?\n\n⌨️ My Score: ${wpm} WPM\n✨ Accuracy: ${accuracy}%\n🎧 Mode: Dictation\n🏅 ${rating.badge} Badge\n\nAccept the challenge!\n\n🔗 https://typemasterai.com\n\nGood luck! 🎯`);
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                    trackShare('challenge_email');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
                  data-testid="button-challenge-email"
                >
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium">Email</span>
                </button>
              </div>
              
              {/* Copy Challenge Link */}
              <button
                onClick={() => {
                  const text = `🎯 DICTATION CHALLENGE!\n\nCan you beat my score?\n\n${rating.emoji} My Score: ${wpm} WPM\n✨ Accuracy: ${accuracy}%\n🎧 Mode: Dictation\n\n🏅 Beat me to claim the ${rating.badge} Badge!\n\n🔗 Accept: https://typemasterai.com`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "Challenge Copied!", description: "Send it to your friends!" });
                  trackShare('challenge_copy');
                }}
                className="w-full py-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-foreground font-medium rounded-xl hover:from-yellow-500/20 hover:to-orange-500/20 transition-all flex items-center justify-center gap-2 border border-yellow-500/20"
                data-testid="button-copy-challenge"
              >
                <Copy className="w-4 h-4" />
                Copy Challenge Message
              </button>
            </div>
            
            {/* Fun Stats */}
            <div className="pt-3 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground">
                {wpm >= 80 ? "🔥 That's faster than 95% of typists!" :
                  wpm >= 60 ? "💪 That's faster than 75% of typists!" :
                    wpm >= 40 ? "⚡ You're above average!" :
                      "🌱 Keep practicing to improve!"}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
