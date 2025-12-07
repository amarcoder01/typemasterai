import { motion } from "framer-motion";
import { useState, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { HelpCircle, Eye, EyeOff, Check, X, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  tooltip?: string;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
  delay?: number;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, tooltip, error, success, icon, delay = 0, className, type, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: delay * 0.1, duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-zinc-300">{label}</label>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger type="button" tabIndex={-1}>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {error && (
            <motion.span
              className="text-xs text-red-400 ml-auto flex items-center gap-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <X className="h-3 w-3" />
              {error}
            </motion.span>
          )}
          {success && !error && (
            <motion.span
              className="ml-auto"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <Check className="h-4 w-4 text-green-500" />
            </motion.span>
          )}
        </div>
        
        <div className="relative group">
          <motion.div
            className={cn(
              "absolute -inset-0.5 rounded-lg opacity-0 blur-sm transition-opacity duration-300",
              isFocused && "opacity-100",
              error ? "bg-red-500/30" : "bg-primary/40"
            )}
            animate={isFocused ? { opacity: 0.6 } : { opacity: 0 }}
          />
          
          <div className="relative">
            {icon && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {icon}
              </div>
            )}
            
            <input
              ref={ref}
              type={inputType}
              className={cn(
                "w-full h-11 bg-zinc-900/80 border rounded-lg px-4 text-sm text-white placeholder:text-zinc-500",
                "focus:outline-none transition-all duration-300",
                "hover:border-zinc-600",
                icon && "pl-10",
                isPassword && "pr-10",
                error 
                  ? "border-red-500/50 focus:border-red-500" 
                  : isFocused 
                    ? "border-primary/70 shadow-lg shadow-primary/10" 
                    : "border-zinc-800",
                className
              )}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              {...props}
            />
            
            {isPassword && (
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

AuthInput.displayName = "AuthInput";

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthProps) {
  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: "", color: "" };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { score: 2, label: "Fair", color: "bg-yellow-500" };
    if (score <= 5) return { score: 3, label: "Good", color: "bg-blue-500" };
    return { score: 4, label: "Strong", color: "bg-green-500" };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <motion.div
            key={level}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              level <= strength.score ? strength.color : "bg-zinc-800"
            )}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: level * 0.1, duration: 0.3 }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={cn(
          "transition-colors",
          strength.score === 1 && "text-red-400",
          strength.score === 2 && "text-yellow-400",
          strength.score === 3 && "text-blue-400",
          strength.score === 4 && "text-green-400"
        )}>
          {strength.label}
        </span>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
          <RequirementIndicator met={password.length >= 8} text="8+ chars" />
          <RequirementIndicator met={/[A-Z]/.test(password)} text="Uppercase" />
          <RequirementIndicator met={/[a-z]/.test(password)} text="Lowercase" />
          <RequirementIndicator met={/[0-9]/.test(password)} text="Number" />
          <RequirementIndicator met={/[^A-Za-z0-9]/.test(password)} text="Special" />
        </div>
      </div>
    </motion.div>
  );
}

function RequirementIndicator({ met, text }: { met: boolean; text: string }) {
  return (
    <span className={cn(
      "flex items-center gap-1 transition-colors",
      met ? "text-green-400" : "text-zinc-500"
    )}>
      {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {text}
    </span>
  );
}

interface CapsLockWarningProps {
  show: boolean;
}

export function CapsLockWarning({ show }: CapsLockWarningProps) {
  if (!show) return null;
  
  return (
    <motion.div
      className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <AlertTriangle className="h-4 w-4" />
      Caps Lock is on
    </motion.div>
  );
}
