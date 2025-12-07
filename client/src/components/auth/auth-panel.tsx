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
        "w-full max-w-md relative",
        className
      )}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-purple-500/20 to-primary/30 rounded-2xl blur-lg opacity-50" />
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/50 via-transparent to-zinc-900/30 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-600 to-transparent" />
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </motion.div>
  );
}

interface AuthPanelContentProps {
  children: React.ReactNode;
}

export function AuthPanelContent({ children }: AuthPanelContentProps) {
  return (
    <div className="p-6 pt-4 space-y-4">
      {children}
    </div>
  );
}

interface AuthPanelFooterProps {
  children: React.ReactNode;
}

export function AuthPanelFooter({ children }: AuthPanelFooterProps) {
  return (
    <motion.div 
      className="p-6 pt-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}
