import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Github, Loader2, Check, ArrowRight } from "lucide-react";

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
      hoverBg: "hover:bg-white/5",
      hoverBorder: "group-hover:border-blue-500/50",
    },
    github: {
      icon: <Github className="w-5 h-5" />,
      label: isRegister ? "Sign up with GitHub" : "Continue with GitHub",
      hoverBg: "hover:bg-white/5",
      hoverBorder: "group-hover:border-zinc-500/50",
    },
    facebook: {
      icon: <FacebookIcon className="w-5 h-5" />,
      label: isRegister ? "Sign up with Facebook" : "Continue with Facebook",
      hoverBg: "hover:bg-blue-500/5",
      hoverBorder: "group-hover:border-blue-600/50",
    },
  };

  const { icon, label, hoverBg, hoverBorder } = config[provider];

  return (
    <motion.button
      type="button"
      className={cn(
        "group relative w-full h-11 flex items-center justify-center gap-3",
        "bg-zinc-900/60 border border-zinc-800 rounded-lg",
        "text-sm font-medium text-zinc-200",
        "transition-all duration-300",
        hoverBg,
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "overflow-hidden"
      )}
      onClick={onClick}
      disabled={disabled}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        initial={{ x: "-100%" }}
        animate={isHovered ? { x: "100%" } : { x: "-100%" }}
        transition={{ duration: 0.5 }}
      />
      
      <motion.div
        className={cn("absolute inset-0 border rounded-lg transition-colors", hoverBorder)}
        style={{ borderColor: "transparent" }}
      />
      
      <span className="relative z-10">{icon}</span>
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
  return (
    <motion.button
      type="submit"
      className={cn(
        "relative w-full h-12 flex items-center justify-center gap-2",
        "bg-gradient-to-r from-primary via-primary to-purple-600",
        "text-white font-semibold rounded-lg",
        "transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/30",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "overflow-hidden group"
      )}
      disabled={disabled || isLoading}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.3 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity, 
          repeatDelay: 3,
          ease: "easeInOut" 
        }}
      />
      
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"
      />

      <span className="relative z-10 flex items-center gap-2">
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Please wait...</span>
          </>
        ) : isSuccess ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <Check className="h-5 w-5" />
            </motion.div>
            <span>Success!</span>
          </>
        ) : (
          <>
            {children}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </span>
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-zinc-800" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-zinc-950 px-3 text-muted-foreground">{text}</span>
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
  return (
    <motion.p 
      className="text-sm text-center text-muted-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      {text}{" "}
      <motion.button
        type="button"
        onClick={onClick}
        className="text-primary hover:text-primary/80 font-medium transition-colors relative"
        data-testid={testId}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {linkText}
        <motion.span
          className="absolute -bottom-0.5 left-0 right-0 h-px bg-primary"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.2 }}
        />
      </motion.button>
    </motion.p>
  );
}
