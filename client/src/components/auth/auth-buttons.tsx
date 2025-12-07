import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Github, Loader2, Check, ArrowRight, Sparkles } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

interface SocialButtonProps {
  provider: "google" | "github" | "facebook";
  onClick: () => void;
  isRegister?: boolean;
  delay?: number;
  disabled?: boolean;
}

export function SocialButton({ provider, onClick, isRegister = false, delay = 0, disabled }: SocialButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const config = {
    google: {
      icon: <GoogleIcon className="w-5 h-5" />,
      label: isRegister ? "Sign up with Google" : "Continue with Google",
      hoverBorder: "group-hover:border-blue-500/50",
      glowColor: "rgba(66, 133, 244, 0.3)",
    },
    github: {
      icon: <Github className="w-5 h-5" />,
      label: isRegister ? "Sign up with GitHub" : "Continue with GitHub",
      hoverBorder: "group-hover:border-zinc-500/50",
      glowColor: "rgba(255, 255, 255, 0.15)",
    },
    facebook: {
      icon: <FacebookIcon className="w-5 h-5" />,
      label: isRegister ? "Sign up with Facebook" : "Continue with Facebook",
      hoverBorder: "group-hover:border-blue-600/50",
      glowColor: "rgba(24, 119, 242, 0.3)",
    },
  };

  const { icon, label, hoverBorder, glowColor } = config[provider];

  return (
    <motion.button
      type="button"
      className={cn(
        "group relative w-full h-12 flex items-center justify-center gap-3",
        "bg-zinc-900/60 border border-zinc-800 rounded-lg",
        "text-sm font-medium text-zinc-200",
        "transition-all duration-300",
        "hover:bg-zinc-800/80",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "overflow-hidden"
      )}
      onClick={onClick}
      disabled={disabled}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay * 0.08, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="absolute inset-0 rounded-lg"
        animate={isHovered ? { 
          boxShadow: `0 0 30px ${glowColor}`,
          opacity: 1,
        } : { 
          boxShadow: "0 0 0px transparent",
          opacity: 0,
        }}
        transition={{ duration: 0.3 }}
      />
      
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: "-200%" }}
        animate={isHovered ? { x: "200%" } : { x: "-200%" }}
        transition={{ duration: 0.6 }}
      />
      
      <motion.div
        className={cn("absolute inset-0 border rounded-lg transition-colors duration-300", hoverBorder)}
        style={{ borderColor: "transparent" }}
      />
      
      <motion.span 
        className="relative z-10"
        animate={isHovered ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.2 }}
      >
        {icon}
      </motion.span>
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}

interface SubmitButtonProps {
  isLoading?: boolean;
  isSuccess?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SubmitButton({ isLoading, isSuccess, children, disabled }: SubmitButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.button
      type="submit"
      className={cn(
        "relative w-full h-12 flex items-center justify-center gap-2",
        "bg-gradient-to-r from-primary via-purple-600 to-primary",
        "text-white font-semibold rounded-lg",
        "transition-all duration-300",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "overflow-hidden group"
      )}
      style={{ backgroundSize: "200% 100%" }}
      disabled={disabled || isLoading}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        backgroundPosition: isHovered ? ["0% 50%", "100% 50%"] : "0% 50%",
      }}
      transition={{ 
        duration: 0.4,
        backgroundPosition: { duration: 0.5 },
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-lg"
        animate={{
          boxShadow: isHovered 
            ? "0 0 40px hsl(var(--primary) / 0.5), 0 0 80px hsl(var(--primary) / 0.3)"
            : "0 0 20px hsl(var(--primary) / 0.3)",
        }}
        transition={{ duration: 0.3 }}
      />
      
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity, 
          repeatDelay: 2,
          ease: "easeInOut" 
        }}
      />
      
      <motion.div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at center, hsl(var(--primary) / 0.3) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <AnimatePresence mode="wait">
        <motion.span 
          key={isLoading ? "loading" : isSuccess ? "success" : "default"}
          className="relative z-10 flex items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-5 w-5" />
              </motion.div>
              <span>Please wait...</span>
            </>
          ) : isSuccess ? (
            <>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <Check className="h-5 w-5" />
              </motion.div>
              <span>Success!</span>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.div>
            </>
          ) : (
            <>
              {children}
              <motion.div
                animate={{ x: isHovered ? 5 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

interface AuthDividerProps {
  text?: string;
}

export function AuthDivider({ text = "Or continue with email" }: AuthDividerProps) {
  return (
    <motion.div 
      className="relative my-6"
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className="absolute inset-0 flex items-center">
        <motion.div 
          className="w-full border-t border-zinc-800"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <motion.span 
          className="bg-zinc-950 px-3 text-muted-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {text}
        </motion.span>
      </div>
    </motion.div>
  );
}

interface AuthLinkProps {
  text: string;
  linkText: string;
  onClick: () => void;
  testId?: string;
}

export function AuthLink({ text, linkText, onClick, testId }: AuthLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.p 
      className="text-sm text-center text-muted-foreground"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
    >
      {text}{" "}
      <motion.button
        type="button"
        onClick={onClick}
        className="text-primary hover:text-primary/80 font-medium transition-colors relative"
        data-testid={testId}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.span
          animate={isHovered ? { 
            textShadow: "0 0 10px hsl(var(--primary) / 0.5)",
          } : {
            textShadow: "0 0 0px transparent",
          }}
        >
          {linkText}
        </motion.span>
        <motion.span
          className="absolute -bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-primary via-purple-500 to-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
      </motion.button>
    </motion.p>
  );
}
