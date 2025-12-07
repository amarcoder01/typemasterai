import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Keyboard, AlertCircle, Github, HelpCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProviderAvailability {
  google: boolean;
  github: boolean;
  facebook: boolean;
}

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

  const handleSocialLogin = (provider: "google" | "github" | "facebook") => {
    if (!isProviderAvailable(provider)) {
      setError("This sign-up method is not currently available.");
      return;
    }
    window.location.href = `/api/auth/${provider}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      await register(username, email, password);
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground">
            <Keyboard className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
            <p className="text-muted-foreground mt-2">Join TypeMasterAI and master your typing skills</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Create a new account to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {anyProviderAvailable && (
                <div className="grid gap-3">
                  {isProviderAvailable("google") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSocialLogin("google")}
                      data-testid="button-register-google"
                    >
                      <GoogleIcon className="w-5 h-5 mr-2" />
                      Sign up with Google
                    </Button>
                  )}
                  {isProviderAvailable("github") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSocialLogin("github")}
                      data-testid="button-register-github"
                    >
                      <Github className="w-5 h-5 mr-2" />
                      Sign up with GitHub
                    </Button>
                  )}
                  {isProviderAvailable("facebook") && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSocialLogin("facebook")}
                      data-testid="button-register-facebook"
                    >
                      <FacebookIcon className="w-5 h-5 mr-2" />
                      Sign up with Facebook
                    </Button>
                  )}
                </div>
              )}

              {anyProviderAvailable && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>
              )}

              <TooltipProvider>
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="username">Username</Label>
                    <Tooltip>
                      <TooltipTrigger type="button" tabIndex={-1}>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>3-30 characters. Letters, numbers, and underscores only. Must start with a letter.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    data-testid="input-username"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="email">Email</Label>
                    <Tooltip>
                      <TooltipTrigger type="button" tabIndex={-1}>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>We'll use this for account verification and password recovery</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="password">Password</Label>
                    <Tooltip>
                      <TooltipTrigger type="button" tabIndex={-1}>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Must include uppercase, lowercase, number, and special character</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                  <p className="text-xs text-muted-foreground">At least 8 characters</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Tooltip>
                      <TooltipTrigger type="button" tabIndex={-1}>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Re-enter your password to make sure it matches</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
              </TooltipProvider>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setLocation("/login")}
                  className="text-primary hover:underline"
                  data-testid="link-login"
                >
                  Sign in
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
