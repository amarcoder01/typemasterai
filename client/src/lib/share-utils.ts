import confetti from "canvas-confetti";

export interface PerformanceRating {
  emoji: string;
  title: string;
  badge: string;
  color: string;
  bgGradient: [string, string, string];
}

export const LANGUAGE_ICONS: Record<string, string> = {
  python: "🐍",
  javascript: "📜",
  typescript: "💙",
  java: "☕",
  cpp: "⚡",
  csharp: "🟣",
  go: "🐹",
  rust: "🦀",
  ruby: "💎",
  php: "🐘",
  swift: "🍎",
  kotlin: "🎯",
  scala: "🔴",
  sql: "🗄️",
  html: "🌐",
  css: "🎨",
  dart: "🎯",
  r: "📊",
};

export interface SocialPlatform {
  name: string;
  color: string;
  icon: 'twitter' | 'facebook' | 'whatsapp' | 'telegram' | 'linkedin' | 'reddit' | 'discord' | 'email';
  getUrl: (text: string, url: string, title?: string) => string;
}

export const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  twitter: {
    name: "Twitter",
    color: "#1DA1F2",
    icon: "twitter",
    getUrl: (text, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  facebook: {
    name: "Facebook",
    color: "#1877F2",
    icon: "facebook",
    getUrl: (text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
  },
  whatsapp: {
    name: "WhatsApp",
    color: "#25D366",
    icon: "whatsapp",
    getUrl: (text, url) => `https://wa.me/?text=${encodeURIComponent(text + "\n\n" + url)}`,
  },
  telegram: {
    name: "Telegram",
    color: "#0088cc",
    icon: "telegram",
    getUrl: (text, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  linkedin: {
    name: "LinkedIn",
    color: "#0A66C2",
    icon: "linkedin",
    getUrl: (text, url, title) => `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || "")}&summary=${encodeURIComponent(text)}`,
  },
  reddit: {
    name: "Reddit",
    color: "#FF4500",
    icon: "reddit",
    getUrl: (text, url, title) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || text.substring(0, 100))}`,
  },
  discord: {
    name: "Discord",
    color: "#5865F2",
    icon: "discord",
    getUrl: (text, url) => `https://discord.com/channels/@me?text=${encodeURIComponent(text + "\n" + url)}`,
  },
  email: {
    name: "Email",
    color: "#6B7280",
    icon: "email",
    getUrl: (text, url, title) => `mailto:?subject=${encodeURIComponent(title || "Check this out!")}&body=${encodeURIComponent(text + "\n\nTry it yourself: " + url)}`,
  },
};

export function getTypingPerformanceRating(wpm: number, accuracy: number): PerformanceRating {
  if (wpm >= 100 && accuracy >= 98) return { emoji: "🏆", title: "Legendary Typist", badge: "Diamond", color: "#b9f2ff", bgGradient: ["#0f172a", "#1e3a5f", "#0f172a"] };
  if (wpm >= 80 && accuracy >= 95) return { emoji: "⚡", title: "Speed Demon", badge: "Platinum", color: "#e5e4e2", bgGradient: ["#0f172a", "#2d3748", "#0f172a"] };
  if (wpm >= 60 && accuracy >= 90) return { emoji: "🔥", title: "Fast & Accurate", badge: "Gold", color: "#ffd700", bgGradient: ["#0f172a", "#3d2914", "#0f172a"] };
  if (wpm >= 40 && accuracy >= 85) return { emoji: "💪", title: "Solid Performer", badge: "Silver", color: "#c0c0c0", bgGradient: ["#0f172a", "#374151", "#0f172a"] };
  return { emoji: "🎯", title: "Rising Star", badge: "Bronze", color: "#cd7f32", bgGradient: ["#0f172a", "#3d2a1a", "#0f172a"] };
}

export function getCodePerformanceRating(wpm: number, accuracy: number): PerformanceRating {
  if (wpm >= 80 && accuracy >= 98) return { emoji: "🏆", title: "Code Master", badge: "Diamond", color: "#b9f2ff", bgGradient: ["#0f172a", "#1e3a5f", "#0f172a"] };
  if (wpm >= 60 && accuracy >= 95) return { emoji: "⚡", title: "Code Ninja", badge: "Platinum", color: "#e5e4e2", bgGradient: ["#0f172a", "#2d3748", "#0f172a"] };
  if (wpm >= 45 && accuracy >= 90) return { emoji: "🔥", title: "Fast Coder", badge: "Gold", color: "#ffd700", bgGradient: ["#0f172a", "#3d2914", "#0f172a"] };
  if (wpm >= 30 && accuracy >= 85) return { emoji: "💪", title: "Code Warrior", badge: "Silver", color: "#c0c0c0", bgGradient: ["#0f172a", "#374151", "#0f172a"] };
  return { emoji: "🎯", title: "Rising Coder", badge: "Bronze", color: "#cd7f32", bgGradient: ["#0f172a", "#3d2a1a", "#0f172a"] };
}

export function getLanguageIcon(language: string): string {
  return LANGUAGE_ICONS[language.toLowerCase()] || "💻";
}

export function triggerCelebration(intensity: 'small' | 'medium' | 'large' = 'medium') {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const configs = {
    small: { particleCount: 30, spread: 40, origin: { y: 0.7 } },
    medium: { particleCount: 60, spread: 70, origin: { y: 0.6 } },
    large: { particleCount: 100, spread: 100, origin: { y: 0.5 } },
  };

  confetti({
    ...configs[intensity],
    colors: ['#00ffff', '#a855f7', '#22c55e', '#f59e0b', '#3b82f6'],
    zIndex: 9999,
  });
}

export function shareToSocialPlatform(
  platform: keyof typeof SOCIAL_PLATFORMS,
  text: string,
  url: string,
  title?: string
) {
  const config = SOCIAL_PLATFORMS[platform];
  if (!config) return;

  const shareUrl = config.getUrl(text, url, title);

  if (platform === 'email') {
    window.location.href = shareUrl;
  } else if (platform === 'discord') {
    navigator.clipboard.writeText(text + "\n" + url);
    return 'copied';
  } else {
    window.open(shareUrl, "_blank", "width=600,height=400");
  }
}

export function buildCodeShareText(
  wpm: number,
  accuracy: number,
  languageName: string,
  characters: number,
  time: string,
  rating: PerformanceRating,
  langIcon: string
): string {
  return `${rating.emoji} I just typed ${languageName} code at ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI!

${langIcon} ${languageName} | ⌨️ ${wpm} WPM | ✨ ${accuracy}% Accuracy
🏅 ${rating.title} - ${rating.badge} Badge
💻 ${characters} characters in ${time}

Think you can code faster? Try it now! 🚀

🔗 https://typemasterai.com/code-mode

#CodeTyping #TypeMasterAI #${languageName.replace(/\s+/g, '')} #Programming`;
}

export function buildTypingShareText(
  wpm: number,
  accuracy: number,
  mode: number,
  rating: PerformanceRating
): string {
  const modeDisplay = mode >= 60 ? `${Math.floor(mode / 60)} minute` : `${mode} second`;
  return `${rating.emoji} I just scored ${wpm} WPM with ${accuracy}% accuracy on TypeMasterAI!

⌨️ ${wpm} WPM | ✨ ${accuracy}% Accuracy
🏅 ${rating.title} - ${rating.badge} Badge
⏱️ ${modeDisplay} typing test

Think you can beat my score? Try it now! 🎯

🔗 https://typemasterai.com

#TypingTest #TypeMasterAI #WPM`;
}

export interface CardDimensions {
  width: number;
  height: number;
}

export const CARD_DIMENSIONS: Record<string, CardDimensions> = {
  standard: { width: 600, height: 400 },
  code: { width: 600, height: 450 }, // Slightly taller for code mode metadata
};

export function drawCardBackground(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  rating: PerformanceRating
) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, rating.bgGradient[0]);
  gradient.addColorStop(0.5, rating.bgGradient[1]);
  gradient.addColorStop(1, rating.bgGradient[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#00ffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

  ctx.strokeStyle = rating.color;
  ctx.lineWidth = 1;
  ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);
}
