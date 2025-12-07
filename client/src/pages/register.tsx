import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Mail, Lock, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import confetti from "canvas-confetti";
import {
  AuthLayout,
  AuthPanel,
  AuthPanelHeader,
  AuthPanelContent,
  AuthPanelFooter,
  AuthInput,
  PasswordStrengthMeter,
  CapsLockWarning,
  SocialButton,
  SubmitButton,
  AuthDivider,
  AuthLink,
} from "@/components/auth";

interface ProviderAvailability {
  google: boolean;
  github: boolean;
  facebook: boolean;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const { data: providers } = useQuery<ProviderAvailability>({
    queryKey: ["provider-availability"],
    queryFn: async () => {
      const response = await fetch("/api/auth/providers/availability");
      if (!response.ok) {
        return { google: false, github: false, facebook: false };
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const isProviderAvailable = (provider: keyof ProviderAvailability) => {
    return providers?.[provider] ?? false;
  };

  const anyProviderAvailable = providers && (providers.google || providers.github || providers.facebook);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const errorParam = params.get("error");
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        google_failed: "Google sign-up failed. Please try again.",
        github_failed: "GitHub sign-up failed. Please try again.",
        facebook_failed: "Facebook sign-up failed. Please try again.",
        oauth_error: "An error occurred during sign-up. Please try again.",
        invalid_state: "Session expired. Please try again.",
        provider_not_configured: "This sign-up method is not available.",
      };
      setError(errorMessages[errorParam] || "Sign-up failed. Please try again.");
    }
  }, [searchString]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  };

  const triggerSuccessConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#8b5cf6', '#a855f7'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#8b5cf6', '#a855f7'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleSocialLogin = (provider: "google" | "github" | "facebook") => {
    if (!isProviderAvailable(provider)) {
      setError("This sign-up method is not currently available.");
      return;
    }
    window.location.href = `/api/auth/${provider}`;
  };

  const validateForm = (): string | null => {
    if (username.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (!/^[a-zA-Z]/.test(username)) {
      return "Username must start with a letter";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Username can only contain letters, numbers, and underscores";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return "Password must contain at least one special character";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await register(username, email, password);
      setIsSuccess(true);
      triggerSuccessConfetti();
      setTimeout(() => setLocation("/"), 1500);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      setIsLoading(false);
    }
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const passwordsDontMatch = password && confirmPassword && password !== confirmPassword;

  return (
    <AuthLayout
      title="Join TypeMasterAI"
      subtitle="Create an account to track your progress, compete on global leaderboards, and unlock AI-powered typing practice with personalized feedback."
    >
      <AuthPanel>
        <form onSubmit={handleSubmit}>
          <AuthPanelHeader
            title="Create Account"
            description="Sign up to start improving your typing skills"
          />
          
          <AuthPanelContent>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {anyProviderAvailable && (
              <motion.div 
                className="grid gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {isProviderAvailable("google") && (
                  <SocialButton
                    provider="google"
                    onClick={() => handleSocialLogin("google")}
                    isRegister
                    delay={1}
                    disabled={isLoading}
                  />
                )}
                {isProviderAvailable("github") && (
                  <SocialButton
                    provider="github"
                    onClick={() => handleSocialLogin("github")}
                    isRegister
                    delay={2}
                    disabled={isLoading}
                  />
                )}
                {isProviderAvailable("facebook") && (
                  <SocialButton
                    provider="facebook"
                    onClick={() => handleSocialLogin("facebook")}
                    isRegister
                    delay={3}
                    disabled={isLoading}
                  />
                )}
              </motion.div>
            )}

            {anyProviderAvailable && <AuthDivider />}

            <AuthInput
              label="Username"
              type="text"
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              data-testid="input-username"
              tooltip="3-30 characters. Letters, numbers, and underscores only. Must start with a letter."
              icon={<User className="h-4 w-4" />}
              delay={4}
              success={username.length >= 3 && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)}
            />

            <AuthInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
              tooltip="We'll use this for account verification and password recovery"
              icon={<Mail className="h-4 w-4" />}
              delay={5}
            />

            <div className="space-y-3">
              <AuthInput
                label="Password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                required
                data-testid="input-password"
                tooltip="Must include uppercase, lowercase, number, and special character"
                icon={<Lock className="h-4 w-4" />}
                delay={6}
              />
              
              <PasswordStrengthMeter password={password} />
              
              <AnimatePresence>
                <CapsLockWarning show={capsLockOn} />
              </AnimatePresence>
            </div>

            <AuthInput
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              required
              data-testid="input-confirm-password"
              tooltip="Re-enter your password to make sure it matches"
              icon={<Lock className="h-4 w-4" />}
              delay={7}
              success={passwordsMatch}
              error={passwordsDontMatch ? "Passwords don't match" : undefined}
            />
          </AuthPanelContent>
          
          <AuthPanelFooter>
            <div className="space-y-4">
              <SubmitButton
                isLoading={isLoading}
                isSuccess={isSuccess}
                disabled={isLoading || isSuccess}
              >
                Create Account
              </SubmitButton>

              <AuthLink
                text="Already have an account?"
                linkText="Sign in"
                onClick={() => setLocation("/login")}
                testId="link-login"
              />

              <motion.p 
                className="text-xs text-center text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                By signing up, you agree to our{" "}
                <button type="button" className="text-primary hover:underline">Terms of Service</button>
                {" "}and{" "}
                <button type="button" className="text-primary hover:underline">Privacy Policy</button>
              </motion.p>
            </div>
          </AuthPanelFooter>
        </form>
      </AuthPanel>
    </AuthLayout>
  );
}
