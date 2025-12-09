import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Keyboard, Sparkles } from "lucide-react";
import { PLATFORM_STATS, formatNumber } from "@shared/platform-stats";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

function FloatingParticles() {
  const particles = useMemo(() => {
    const colors = [
      "bg-primary/30",
      "bg-purple-500/30",
      "bg-blue-500/20",
      "bg-pink-500/20",
    ];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${particle.color}`}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            filter: "blur(1px)",
          }}
          animate={{
            y: [0, -50, 0],
            x: [0, 25, -25, 0],
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function PulsingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
          left: "-20%",
          top: "-20%",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(262 83% 58% / 0.12) 0%, transparent 70%)",
          right: "-15%",
          bottom: "-15%",
        }}
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(280 70% 50% / 0.1) 0%, transparent 70%)",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />
    </div>
  );
}

function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    setMousePosition({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse 100% 80% at ${mousePosition.x}% ${mousePosition.y}%,
              hsl(var(--primary) / 0.2) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 80% 100% at ${100 - mousePosition.x}% ${100 - mousePosition.y}%,
              hsl(262 83% 58% / 0.15) 0%,
              transparent 50%
            ),
            linear-gradient(
              180deg,
              hsl(var(--background)) 0%,
              hsl(240 10% 4%) 50%,
              hsl(var(--background)) 100%
            )
          `,
        }}
        animate={{
          opacity: [1, 0.9, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <PulsingOrbs />
      <FloatingParticles />
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <AnimatedBackground />
      
      <div className="w-full max-w-5xl relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <motion.div
          className="hidden lg:flex flex-col gap-8"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <motion.div 
              className="relative h-24"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <img 
                src="/logo.svg" 
                alt="TypeMasterAI Logo" 
                className="h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(0,255,255,0.3)]"
              />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                Master your typing skills
              </p>
            </div>
          </motion.div>

          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              <motion.span 
                className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent inline-block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                {title}
              </motion.span>
            </h1>
            <motion.p 
              className="text-lg text-muted-foreground leading-relaxed max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              {subtitle}
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-4 mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <StatCard value={formatNumber(PLATFORM_STATS.TOTAL_TESTS)} label="Tests Completed" delay={0.7} />
            <StatCard value={formatNumber(PLATFORM_STATS.TOTAL_USERS)} label="Active Users" delay={0.8} />
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-3 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <FeatureTag icon="🎯" text="AI-Powered Practice" delay={0} />
            <FeatureTag icon="🏆" text="Global Leaderboards" delay={0.1} />
            <FeatureTag icon="📊" text="Advanced Analytics" delay={0.2} />
            <FeatureTag icon="🎮" text="Multiplayer Racing" delay={0.3} />
          </motion.div>
        </motion.div>

        <motion.div
          className="flex flex-col items-center lg:items-end"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="lg:hidden flex flex-col items-center gap-4 mb-8">
            <motion.div 
              className="relative h-20"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
            >
              <img 
                src="/logo.svg" 
                alt="TypeMasterAI Logo" 
                className="h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(0,255,255,0.3)]"
              />
            </motion.div>
            <div className="text-center">
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            </div>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      className="relative bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 text-center overflow-hidden group cursor-default"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring" }}
      whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary) / 0.5)" }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6 }}
      />
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle at center, hsl(var(--primary) / 0.1) 0%, transparent 70%)",
        }}
      />
      <motion.div 
        className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent relative z-10"
        animate={{ 
          scale: [1, 1.02, 1],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {value}
      </motion.div>
      <div className="text-xs text-muted-foreground mt-1 relative z-10">{label}</div>
    </motion.div>
  );
}

function FeatureTag({ icon, text, delay }: { icon: string; text: string; delay: number }) {
  return (
    <motion.div
      className="flex items-center gap-2 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-full px-3 py-1.5 text-sm cursor-default group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1 + delay, duration: 0.4 }}
      whileHover={{ scale: 1.08, borderColor: "hsl(var(--primary) / 0.5)" }}
    >
      <motion.span
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: delay }}
      >
        {icon}
      </motion.span>
      <span className="text-zinc-300 group-hover:text-white transition-colors">{text}</span>
    </motion.div>
  );
}
