import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { Keyboard } from "lucide-react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

function FloatingParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, -15, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.2, 1],
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
              ellipse 80% 60% at ${mousePosition.x}% ${mousePosition.y}%,
              hsl(var(--primary) / 0.15) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 60% 80% at ${100 - mousePosition.x}% ${100 - mousePosition.y}%,
              hsl(262 83% 58% / 0.1) 0%,
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
          opacity: [1, 0.95, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <FloatingParticles />
      <div 
        className="absolute inset-0 opacity-[0.015]"
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
              className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/25"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Keyboard className="w-8 h-8" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                TypeMasterAI
              </h2>
              <p className="text-sm text-muted-foreground">Master your typing skills</p>
            </div>
          </motion.div>

          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                {title}
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
              {subtitle}
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-3 gap-4 mt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <StatCard value="10M+" label="Tests Taken" delay={0.7} />
            <StatCard value="150+" label="WPM Record" delay={0.8} />
            <StatCard value="50K+" label="Active Users" delay={0.9} />
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-3 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <FeatureTag icon="🎯" text="AI-Powered Practice" />
            <FeatureTag icon="🏆" text="Global Leaderboards" />
            <FeatureTag icon="📊" text="Advanced Analytics" />
            <FeatureTag icon="🎮" text="Multiplayer Racing" />
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
              className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/25"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
            >
              <Keyboard className="w-8 h-8" />
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
      className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-4 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring" }}
      whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary) / 0.5)" }}
    >
      <div className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </motion.div>
  );
}

function FeatureTag({ icon, text }: { icon: string; text: string }) {
  return (
    <motion.div
      className="flex items-center gap-2 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-full px-3 py-1.5 text-sm"
      whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary) / 0.5)" }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <span>{icon}</span>
      <span className="text-zinc-300">{text}</span>
    </motion.div>
  );
}
