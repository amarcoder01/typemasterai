import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Keyboard, Sparkles, Zap, TrendingUp, Users, Brain, Trophy, BarChart3, Gamepad2, Star, CheckCircle2 } from "lucide-react";

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
      
      <div className="w-full max-w-6xl relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        <motion.div
          className="hidden lg:flex flex-col gap-6"
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
              className="relative w-14 h-14"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary to-purple-600 rounded-xl"
                animate={{
                  boxShadow: [
                    "0 0 20px hsl(var(--primary) / 0.3)",
                    "0 0 40px hsl(var(--primary) / 0.5)",
                    "0 0 20px hsl(var(--primary) / 0.3)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="relative w-full h-full flex items-center justify-center text-white">
                <Keyboard className="w-7 h-7" />
              </div>
            </motion.div>
            <div>
              <motion.h2 
                className="text-xl font-bold bg-gradient-to-r from-white via-primary/90 to-purple-400 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ duration: 5, repeat: Infinity }}
                style={{ backgroundSize: "200% 200%" }}
              >
                TypeMasterAI
              </motion.h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" />
                The #1 AI-Powered Typing Platform
              </p>
            </div>
          </motion.div>

          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
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
              className="text-base text-muted-foreground leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              {subtitle}
            </motion.p>
          </motion.div>

          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <p className="text-xs font-medium text-primary uppercase tracking-wider">Why Choose Us</p>
            <div className="grid gap-2.5">
              <BenefitItem 
                icon={<Brain className="w-4 h-4" />}
                title="AI-Powered Learning"
                description="Smart algorithms adapt to your skill level"
                delay={0}
              />
              <BenefitItem 
                icon={<TrendingUp className="w-4 h-4" />}
                title="Track Your Progress"
                description="Detailed analytics show your improvement"
                delay={0.1}
              />
              <BenefitItem 
                icon={<Gamepad2 className="w-4 h-4" />}
                title="Race Against Others"
                description="Compete in real-time multiplayer races"
                delay={0.2}
              />
              <BenefitItem 
                icon={<Trophy className="w-4 h-4" />}
                title="Climb the Ranks"
                description="Global leaderboards with ELO ratings"
                delay={0.3}
              />
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-6 pt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-xs font-medium"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.1 }}
                  >
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                  </motion.div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">50K+</p>
                <p className="text-xs text-muted-foreground">Active typists</p>
              </div>
            </div>
            
            <div className="h-8 w-px bg-zinc-800" />
            
            <div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2 + i * 0.05 }}
                  >
                    <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                  </motion.div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">4.9 average rating</p>
            </div>
          </motion.div>

          <motion.div
            className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6 }}
          >
            <div className="flex items-start gap-3">
              <motion.div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center flex-shrink-0"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Zap className="w-5 h-5 text-primary" />
              </motion.div>
              <div>
                <p className="text-sm text-zinc-300 italic">
                  "Went from 45 WPM to 95 WPM in just 3 months! The AI practice sessions are incredibly effective."
                </p>
                <p className="text-xs text-muted-foreground mt-2">— Sarah K., Software Developer</p>
              </div>
            </div>
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
              className="relative w-16 h-16"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary to-purple-600 rounded-2xl"
                animate={{
                  boxShadow: [
                    "0 0 20px hsl(var(--primary) / 0.3)",
                    "0 0 40px hsl(var(--primary) / 0.5)",
                    "0 0 20px hsl(var(--primary) / 0.3)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="relative w-full h-full flex items-center justify-center text-white">
                <Keyboard className="w-8 h-8" />
              </div>
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

function BenefitItem({ icon, title, description, delay }: { icon: React.ReactNode; title: string; description: string; delay: number }) {
  return (
    <motion.div
      className="flex items-start gap-3 group cursor-default"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.7 + delay, duration: 0.4 }}
      whileHover={{ x: 5 }}
    >
      <motion.div 
        className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5"
        whileHover={{ scale: 1.1, borderColor: "hsl(var(--primary) / 0.5)" }}
      >
        {icon}
      </motion.div>
      <div>
        <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}
