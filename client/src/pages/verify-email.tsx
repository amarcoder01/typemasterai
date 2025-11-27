import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

type VerificationState = "loading" | "success" | "error" | "expired";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const token = params.get("token");
    
    if (!token) {
      setState("error");
      setMessage("No verification token provided.");
      return;
    }

    verifyEmail(token);
  }, [searchString]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "TOKEN_EXPIRED") {
          setState("expired");
          setMessage("This verification link has expired.");
        } else {
          setState("error");
          setMessage(data.message || "Failed to verify email.");
        }
        return;
      }

      setState("success");
      setMessage("Your email has been verified successfully!");
    } catch (err) {
      setState("error");
      setMessage("An error occurred while verifying your email.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {state === "loading" && (
          <>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Verifying Email</h1>
                <p className="text-muted-foreground mt-2">
                  Please wait while we verify your email address...
                </p>
              </div>
            </div>
          </>
        )}

        {state === "success" && (
          <>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Email Verified!</h1>
                <p className="text-muted-foreground mt-2">{message}</p>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Your account is now fully activated. You can access all features of TypeMasterAI.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => setLocation("/")}
                      className="w-full"
                      data-testid="button-start-typing"
                    >
                      Start Typing
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/profile")}
                      data-testid="button-view-profile"
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {state === "expired" && (
          <>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center text-white">
                <Mail className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Link Expired</h1>
                <p className="text-muted-foreground mt-2">{message}</p>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Email verification links expire after 24 hours for security reasons. 
                    Please request a new verification email.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => setLocation("/settings")}
                      className="w-full"
                      data-testid="button-resend-verification"
                    >
                      Resend Verification Email
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/")}
                      data-testid="button-go-home"
                    >
                      Go to Homepage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {state === "error" && (
          <>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-destructive rounded-2xl flex items-center justify-center text-destructive-foreground">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Verification Failed</h1>
                <p className="text-muted-foreground mt-2">{message}</p>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    If you continue to experience issues, please contact our support team.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => setLocation("/settings")}
                      className="w-full"
                      data-testid="button-request-new-verification"
                    >
                      Request New Verification
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/contact")}
                      data-testid="button-contact-support"
                    >
                      Contact Support
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setLocation("/")}
                      data-testid="button-go-home"
                    >
                      Go to Homepage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
