import React from 'react';
import { 
  Twitter, 
  Facebook, 
  Linkedin, 
  MessageCircle, 
  Send, 
  Mail, 
  Copy 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareResultsProps {
  wpm: number;
  accuracy: number;
  mode: number | string; // Can be duration in seconds (60) or string ("Dictation")
  onShareTracked?: (platform: string) => void;
  className?: string;
}

// Helper to determine performance rating - Replicated from Standard Mode
const getPerformanceRating = (wpm: number, accuracy: number) => {
  if (wpm >= 100 && accuracy >= 98) return { title: 'Typing God', badge: '🏆', emoji: '👑' };
  if (wpm >= 80 && accuracy >= 95) return { title: 'Grandmaster', badge: '⚡', emoji: '🚀' };
  if (wpm >= 60 && accuracy >= 92) return { title: 'Professional', badge: '🔥', emoji: '🔥' };
  if (wpm >= 40) return { title: 'Intermediate', badge: '✨', emoji: '✨' };
  return { title: 'Novice', badge: '🌱', emoji: '🌱' };
};

/**
 * ShareResults Component
 * 
 * A reusable component for sharing typing test results to social media.
 * replicates the exact UI and logic from the Standard Quick Test mode.
 */
export function ShareResults({ 
  wpm, 
  accuracy, 
  mode, 
  onShareTracked,
  className = ""
}: ShareResultsProps) {
  const { toast } = useToast();

  const handleTrackShare = (platform: string) => {
    if (onShareTracked) {
      onShareTracked(platform);
    }
  };

  const getModeDisplay = () => {
    if (typeof mode === 'number') {
      return mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
    }
    return mode;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Challenge Link Generator Section */}
      <div className="text-center space-y-2 mb-4">
        <div className="text-4xl">🎯</div>
        <h3 className="text-lg font-bold">Challenge a Friend</h3>
        <p className="text-sm text-muted-foreground">
          Send a personalized challenge and see if they can beat your score!
        </p>
      </div>

      {/* Challenge Link Generator */}
      <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Score to Beat:</span>
            <span className="text-lg font-bold text-primary">{wpm} WPM</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Accuracy Target:</span>
            <span className="text-lg font-bold text-green-400">{accuracy}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Test Duration:</span>
            <span className="text-lg font-bold text-purple-400">
              {typeof mode === 'number' 
                ? (mode >= 60 ? `${Math.floor(mode / 60)} min` : `${mode}s`) 
                : mode}
            </span>
          </div>
        </div>
      </div>

      {/* Social Share Buttons Grid */}
      <div className="space-y-2">
        <p className="text-xs text-center text-muted-foreground uppercase tracking-wide">
          Send Challenge Via
        </p>
        <div className="grid grid-cols-3 gap-2">
          {/* Twitter / X */}
          <button
            onClick={() => {
              const rating = getPerformanceRating(wpm, accuracy);
              const text = encodeURIComponent(`${rating.emoji} I just hit ${wpm} WPM! Can you beat my score? 🎯\n\nChallenge accepted?\n\n#TypeMasterAI #Challenge`);
              window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
              handleTrackShare('challenge_twitter');
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/25 border border-[#1DA1F2]/20 transition-all"
            data-testid="button-challenge-twitter"
          >
            <Twitter className="w-4 h-4 text-[#1DA1F2]" />
            <span className="text-xs font-medium">X (Twitter)</span>
          </button>

          {/* Facebook */}
          <button
            onClick={() => {
              const rating = getPerformanceRating(wpm, accuracy);
              const text = encodeURIComponent(`🎯 Typing Challenge Alert!\n\nI just scored ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI! ${rating.emoji}\n\nI'm challenging YOU! Think you can type faster than me? There's only one way to find out...\n\nDo you accept the challenge? 😏🔥`);
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://typemasterai.com')}&quote=${text}`, '_blank', 'width=600,height=400');
              handleTrackShare('challenge_facebook');
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/25 border border-[#1877F2]/20 transition-all"
            data-testid="button-challenge-facebook"
          >
            <Facebook className="w-4 h-4 text-[#1877F2]" />
            <span className="text-xs font-medium">Facebook</span>
          </button>

          {/* LinkedIn */}
          <button
            onClick={() => {
              const rating = getPerformanceRating(wpm, accuracy);
              const modeDisplay = getModeDisplay();
              const text = encodeURIComponent(`Typing Speed Benchmark Challenge\n\nI recently completed a typing assessment achieving ${wpm} WPM with ${accuracy}% accuracy (${rating.title} level).\n\nInterested in comparing your typing speed? This quick assessment provides objective metrics on typing efficiency—a useful baseline for anyone looking to improve their digital communication productivity.\n\nTest duration: ${modeDisplay}\n\n#ProfessionalDevelopment #Productivity`);
              window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://typemasterai.com')}`, '_blank', 'width=600,height=400');
              handleTrackShare('challenge_linkedin');
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0A66C2]/10 hover:bg-[#0A66C2]/25 border border-[#0A66C2]/20 transition-all"
            data-testid="button-challenge-linkedin"
          >
            <Linkedin className="w-4 h-4 text-[#0A66C2]" />
            <span className="text-xs font-medium">LinkedIn</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={() => {
              const rating = getPerformanceRating(wpm, accuracy);
              const modeDisplay = getModeDisplay();
              const waChallenge = `*TypeMasterAI Challenge*\n\nMy Score: *${wpm} WPM*\nAccuracy: *${accuracy}%*\nDuration: ${modeDisplay} test\nBadge: ${rating.badge}\n\nBeat my score: https://typemasterai.com`;
              window.open(`https://wa.me/?text=${encodeURIComponent(waChallenge)}`, '_blank', 'width=600,height=400');
              handleTrackShare('challenge_whatsapp');
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/25 border border-[#25D366]/20 transition-all"
            data-testid="button-challenge-whatsapp"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            <span className="text-xs font-medium">WhatsApp</span>
          </button>

          {/* Telegram */}
          <button
            onClick={() => {
              const rating = getPerformanceRating(wpm, accuracy);
              const text = `🎯 TYPING CHALLENGE!\n\n${rating.emoji} Can you beat my ${wpm} WPM with ${accuracy}% accuracy?\n\nAccept the challenge:`;
              window.open(`https://t.me/share/url?url=${encodeURIComponent('https://typemasterai.com')}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
              handleTrackShare('challenge_telegram');
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-all"
            data-testid="button-challenge-telegram"
          >
            <Send className="w-4 h-4 text-[#0088cc]" />
            <span className="text-xs font-medium">Telegram</span>
          </button>

          {/* Email */}
          <button
            onClick={() => {
              const rating = getPerformanceRating(wpm, accuracy);
              const modeDisplay = getModeDisplay();
              const subject = encodeURIComponent(`🎯 Typing Challenge: Can you beat my ${wpm} WPM?`);
              const body = encodeURIComponent(`Hey!\n\n🎯 I CHALLENGE YOU!\n\n${rating.emoji} Can you beat my typing score?\n\n⌨️ My Score: ${wpm} WPM\n✨ Accuracy: ${accuracy}%\n⏱️ ${modeDisplay} test\n🏅 ${rating.badge} Badge\n\nAccept the challenge and prove your typing skills!\n\n🔗 https://typemasterai.com\n\nGood luck! 🎯`);
              window.open(`mailto:?subject=${subject}&body=${body}`);
              handleTrackShare('challenge_email');
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-500/10 hover:bg-gray-500/25 border border-gray-500/20 transition-all"
            data-testid="button-challenge-email"
          >
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium">Email</span>
          </button>

           {/* Reddit */}
           <button
            onClick={() => {
              const title = encodeURIComponent(`I challenge you to beat my ${wpm} WPM typing score!`);
              window.open(`https://www.reddit.com/submit?url=${encodeURIComponent('https://typemasterai.com')}&title=${title}`, '_blank', 'width=600,height=600');
              handleTrackShare('challenge_reddit');
            }}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/25 border border-[#FF4500]/20 transition-all"
            data-testid="button-challenge-reddit"
          >
            <svg className="w-4 h-4 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
            <span className="text-xs font-medium">Reddit</span>
          </button>
        </div>

        {/* Copy Challenge Link Button */}
        <button
          onClick={() => {
            const rating = getPerformanceRating(wpm, accuracy);
            const modeDisplay = getModeDisplay();
            const text = `🎯 TYPING CHALLENGE!\n\nCan you beat my score?\n\n${rating.emoji} My Score: ${wpm} WPM\n✨ Accuracy: ${accuracy}%\n⏱️ ${modeDisplay} test\n\n🏅 Beat me to claim the ${rating.badge} Badge!\n\n🔗 Accept the challenge: https://typemasterai.com`;
            navigator.clipboard.writeText(text);
            toast({ title: "Challenge Copied!", description: "Send it to your friends!" });
            handleTrackShare('challenge_copy');
          }}
          className="w-full py-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-foreground font-medium rounded-xl hover:from-yellow-500/20 hover:to-orange-500/20 transition-all flex items-center justify-center gap-2 border border-yellow-500/20 mt-2"
          data-testid="button-copy-challenge"
        >
          <Copy className="w-4 h-4" />
          Copy Challenge Message
        </button>
      </div>
    </div>
  );
}
