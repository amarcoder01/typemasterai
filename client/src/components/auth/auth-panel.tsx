import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AuthPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthPanel({ children, className }: AuthPanelProps) {
  return (
    <motion.div
      className={cn(
        "w-full max-w-md relative group",
        className
      )}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div 
        className="absolute -inset-1 bg-gradient-to-r from-primary/40 via-purple-500/30 to-pink-500/40 rounded-2xl blur-xl"
        animate={{
          opacity: [0.4, 0.6, 0.4],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div 
        className="absolute -inset-0.5 rounded-2xl overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-primary"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ backgroundSize: "200% 200%", opacity: 0.3 }}
        />
      </motion.div>
      
      <div className="relative bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-zinc-900/60 via-transparent to-zinc-900/40 pointer-events-none"
          animate={{
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.div 
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), hsl(262 83% 58% / 0.5), transparent)",
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 5,
            ease: "easeInOut",
          }}
        />
        
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

interface AuthPanelHeaderProps {
  title: string;
  description: string;
}

export function AuthPanelHeader({ title, description }: AuthPanelHeaderProps) {
  return (
    <motion.div 
      className="p-6 pb-2"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <motion.h2 
        className="text-2xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {title}
      </motion.h2>
      <motion.p 
        className="text-sm text-muted-foreground mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        {description}
      </motion.p>
    </motion.div>
  );
}

interface AuthPanelContentProps {
  children: React.ReactNode;
}

export function AuthPanelContent({ children }: AuthPanelContentProps) {
  return (
    <motion.div 
      className="p-6 pt-4 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

interface AuthPanelFooterProps {
  children: React.ReactNode;
}

export function AuthPanelFooter({ children }: AuthPanelFooterProps) {
  return (
    <motion.div 
      className="p-6 pt-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
