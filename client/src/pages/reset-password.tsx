import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Keyboard, AlertCircle, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      validateToken(tokenParam);
    } else {
      setIsValidToken(false);
    }
  }, [searchString]);

  const validateToken = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/auth/validate-reset-token?token=${tokenValue}`);
      const data = await response.json();
      setIsValidToken(data.valid);
    } catch (err) {
      setIsValidToken(false);
    }
  };

  const validatePassword = () => {
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("One number");
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordErrors = validatePassword();
    if (passwordErrors.length > 0) {
      setError(`Password must have: ${passwordErrors.join(", ")}`);
      return;
    }

    setIsLoading(true);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, timezone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-destructive rounded-2xl flex items-center justify-center text-destructive-foreground">
              <XCircle className="w-8 h-8" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">Invalid or Expired Link</h1>
              <p className="text-muted-foreground mt-2">
                This password reset link is invalid or has expired.
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Password reset links expire after 1 hour for security reasons. Please request a new link.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => setLocation("/forgot-password")}
                    data-testid="button-request-new-link"
                  >
                    Request New Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/login")}
                    data-testid="button-back-to-login"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">Password Reset!</h1>
              <p className="text-muted-foreground mt-2">
                Your password has been successfully reset.
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  You can now log in with your new password.
                </p>
                <Button
                  onClick={() => setLocation("/login")}
                  className="w-full"
                  data-testid="button-go-to-login"
                >
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground">
            <Keyboard className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Set New Password</h1>
            <p className="text-muted-foreground mt-2">
              Create a strong password for your account.
            </p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>New Password</CardTitle>
              <CardDescription>
                Your password must be at least 8 characters and include uppercase, lowercase, and a number.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <ul className="text-xs space-y-1 mt-2">
                    {[
                      { check: password.length >= 8, text: "At least 8 characters" },
                      { check: /[A-Z]/.test(password), text: "One uppercase letter" },
                      { check: /[a-z]/.test(password), text: "One lowercase letter" },
                      { check: /[0-9]/.test(password), text: "One number" },
                    ].map(({ check, text }) => (
                      <li key={text} className={`flex items-center gap-1 ${check ? "text-green-600" : "text-muted-foreground"}`}>
                        {check ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-xs ${password === confirmPassword ? "text-green-600" : "text-destructive"}`}>
                    {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || validatePassword().length > 0 || password !== confirmPassword}
                data-testid="button-reset-password"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
