import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Mail, Lock, Bell } from "lucide-react";
import { notificationManager } from "@/lib/notification-manager";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import confetti from "canvas-confetti";
import {
  AuthLayout,
  AuthPanel,
  AuthPanelHeader,
  AuthPanelContent,
  AuthPanelFooter,
  AuthInput,
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

export default function Login() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(true);

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
        google_failed: "Google sign-in failed. Please try again.",
        github_failed: "GitHub sign-in failed. Please try again.",
        facebook_failed: "Facebook sign-in failed. Please try again.",
        oauth_error: "An error occurred during sign-in. Please try again.",
        invalid_state: "Session expired. Please try signing in again.",
        provider_not_configured: "This sign-in method is not available.",
      };
      setError(errorMessages[errorParam] || "Sign-in failed. Please try again.");
    }
  }, [searchString]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  };

  const triggerSuccessConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#8b5cf6', '#a855f7'],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Trigger notification permission request if enabled (using the click gesture)
      if (enableNotifications && notificationManager.isSupported()) {
        try {
          // We don't await this as we don't want to block login if the user is slow to click
          // The click gesture is still valid here because it's the start of the handler
          notificationManager.requestPermission();
        } catch (nErr) {
          console.error("Failed to request notification permission:", nErr);
        }
      }

      await login(email, password, rememberMe);
      setIsSuccess(true);
      triggerSuccessConfetti();
      setTimeout(() => setLocation("/"), 800);
    } catch (err: any) {
      setError(err.message || "Invalid email or password. Please try again.");
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: "google" | "github" | "facebook") => {
    if (!isProviderAvailable(provider)) {
      setError("This sign-in method is not currently available.");
      return;
    }

    // Trigger notification permission request if enabled (using the click gesture)
    if (enableNotifications && notificationManager.isSupported()) {
      try {
        // Social login redirects immediately, so we trigger and then redirect
        notificationManager.requestPermission();
      } catch (nErr) {
        console.error("Failed to request notification permission:", nErr);
      }
    }

    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue your typing journey. Track your progress, compete with others, and improve your skills with AI-powered practice."
    >
      <AuthPanel>
        <form onSubmit={handleSubmit}>
          <AuthPanelHeader
            title="Sign In"
            description="Enter your credentials to access your account"
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
                    delay={1}
                    disabled={isLoading}
                  />
                )}
                {isProviderAvailable("github") && (
                  <SocialButton
                    provider="github"
                    onClick={() => handleSocialLogin("github")}
                    delay={2}
                    disabled={isLoading}
                  />
                )}
                {isProviderAvailable("facebook") && (
                  <SocialButton
                    provider="facebook"
                    onClick={() => handleSocialLogin("facebook")}
                    delay={3}
                    disabled={isLoading}
                  />
                )}
              </motion.div>
            )}

            {anyProviderAvailable && <AuthDivider />}

            <AuthInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
              tooltip="Enter the email address you used to create your account"
              icon={<Mail className="h-4 w-4" />}
              delay={4}
            />

            <div className="space-y-2">
              <AuthInput
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                required
                data-testid="input-password"
                tooltip="Enter your account password"
                icon={<Lock className="h-4 w-4" />}
                delay={5}
              />

              <AnimatePresence>
                <CapsLockWarning show={capsLockOn} />
              </AnimatePresence>

              <motion.div
                className="flex justify-end"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  type="button"
                  onClick={() => setLocation("/forgot-password")}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                  data-testid="link-forgot-password"
                >
                  Forgot password?
                </button>
              </motion.div>
            </div>

            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                data-testid="checkbox-remember-me"
                className="border-zinc-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer text-zinc-400">
                Remember me for 30 days
              </Label>
            </motion.div>

            {notificationManager.isSupported() && (
              <motion.div
                className="flex items-center space-x-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Checkbox
                  id="enable-notifications"
                  checked={enableNotifications}
                  onCheckedChange={(checked) => setEnableNotifications(checked === true)}
                  className="border-zinc-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="enable-notifications" className="text-sm font-normal cursor-pointer text-zinc-400 flex items-center gap-1.5">
                    <Bell className="h-3 w-3" /> Enable browser notifications
                  </Label>
                  <p className="text-[10px] text-zinc-500">Get daily reminders and streak alerts</p>
                </div>
              </motion.div>
            )}
          </AuthPanelContent>

          <AuthPanelFooter>
            <div className="space-y-4">
              <SubmitButton
                isLoading={isLoading}
                isSuccess={isSuccess}
                disabled={isLoading || isSuccess}
              >
                Sign In
              </SubmitButton>

              <AuthLink
                text="Don't have an account?"
                linkText="Sign up"
                onClick={() => setLocation("/register")}
                testId="link-register"
              />
            </div>
          </AuthPanelFooter>
        </form>
      </AuthPanel>
    </AuthLayout>
  );
}
