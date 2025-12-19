import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Zap,
  Target,
  Timer,
  Award,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Lock,
  Fingerprint,
  BadgeCheck,
  Info,
  RefreshCw,
  FileWarning,
  Ban,
  CalendarX,
  KeyRound,
  ShieldOff,
  HelpCircle,
  ScanLine,
  Database,
  Hash,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/lib/seo";
import type { VerificationResponse } from "@shared/schema";

// Professional error codes for tracking
const ERROR_CODES = {
  NOT_FOUND: "ERR_CERT_001",
  INVALID_FORMAT: "ERR_CERT_002",
  RATE_LIMITED: "ERR_CERT_003",
  SIGNATURE_FAILED: "ERR_CERT_004",
  REVOKED: "ERR_CERT_005",
  EXPIRED: "ERR_CERT_006",
  TAMPERED: "ERR_CERT_007",
  UNKNOWN: "ERR_CERT_999",
} as const;

// Certificate type display names
const CERTIFICATE_TYPE_NAMES: Record<string, string> = {
  standard: "Standard Typing Test",
  code: "Code Typing Test",
  book: "Book Reading Mode",
  race: "Multiplayer Race",
  dictation: "Dictation Mode",
  stress: "Stress Test Mode",
};

// Tier colors for visual display
const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Diamond: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  Platinum: { bg: "bg-slate-300/10", text: "text-slate-300", border: "border-slate-400/30" },
  Gold: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  Silver: { bg: "bg-gray-400/10", text: "text-gray-300", border: "border-gray-400/30" },
  Bronze: { bg: "bg-orange-600/10", text: "text-orange-400", border: "border-orange-600/30" },
};

export default function VerifyPage() {
  const params = useParams<{ verificationId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [inputValue, setInputValue] = useState("");
  const [searchId, setSearchId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize from URL params
  useEffect(() => {
    if (params.verificationId) {
      setInputValue(params.verificationId);
      setSearchId(params.verificationId);
    }
  }, [params.verificationId]);

  // Fetch verification result
  const {
    data: verificationResult,
    isLoading,
    error,
    refetch,
  } = useQuery<VerificationResponse>({
    queryKey: ["verify", searchId],
    queryFn: async () => {
      const response = await fetch(`/api/verify/${encodeURIComponent(searchId!)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Verification failed");
      }
      return response.json();
    },
    enabled: !!searchId,
    retry: false,
    staleTime: 30000,
  });

  // Dynamic SEO based on verification result
  const seoTitle = useMemo(() => {
    if (verificationResult?.verified && verificationResult.certificate?.username) {
      return `Verified: ${verificationResult.certificate.username}'s ${verificationResult.certificate.wpm} WPM Certificate | TypeMasterAI`;
    }
    if (verificationResult && !verificationResult.verified) {
      return "Certificate Verification Failed | TypeMasterAI";
    }
    return "Official Certificate Verification | TypeMasterAI";
  }, [verificationResult]);

  const seoDescription = useMemo(() => {
    if (verificationResult?.verified && verificationResult.certificate) {
      return `Officially verified TypeMasterAI certificate for ${verificationResult.certificate.username || 'user'}: ${verificationResult.certificate.wpm} WPM with ${verificationResult.certificate.accuracy.toFixed(1)}% accuracy. Issued by TypeMasterAI.`;
    }
    return "Verify the authenticity of TypeMasterAI typing certificates. Enter a verification ID to confirm certificate validity and view achievement details.";
  }, [verificationResult]);

  useSEO({
    title: seoTitle,
    description: seoDescription,
    keywords: "certificate verification, typing certificate, verify certificate, TypeMasterAI, authentic certificate, digital signature",
    ogTitle: seoTitle,
    ogDescription: seoDescription,
    canonical: searchId ? `https://typemasterai.com/verify/${searchId}` : "https://typemasterai.com/verify",
  });

  // Handle search with professional validation
  const handleSearch = useCallback(() => {
    const trimmed = inputValue.trim().toUpperCase();
    if (!trimmed) {
      toast({
        title: "Verification ID Required",
        description: "Please enter the certificate verification ID found at the bottom of your certificate.",
        variant: "destructive",
      });
      return;
    }

    // Validate format - accept both old (TM-XXXX-XXXX) and new (TM-XXXX-XXXX-XXXX) formats
    const isValidNewFormat = /^TM-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(trimmed);
    const isValidOldFormat = /^TM-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(trimmed);

    if (!isValidNewFormat && !isValidOldFormat) {
      toast({
        title: "Unrecognized ID Format",
        description: "Certificate IDs follow the format TM-XXXX-XXXX-XXXX. Please verify the ID on your certificate.",
        variant: "destructive",
      });
      return;
    }

    setSearchId(trimmed);
    setLocation(`/verify/${trimmed}`);
  }, [inputValue, setLocation, toast]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Copy verification URL with professional feedback
  const copyVerificationUrl = useCallback(() => {
    if (verificationResult?.certificate?.verificationId) {
      const url = `${window.location.origin}/verify/${verificationResult.certificate.verificationId}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Verification Link Copied",
        description: "Share this link to allow others to verify this certificate's authenticity.",
      });
    }
  }, [verificationResult, toast]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Memoized status display for performance - computed once per state change
  const statusDisplay = useMemo(() => {
    if (isLoading) {
      return {
        icon: <Loader2 className="w-16 h-16 text-primary animate-spin" />,
        title: "Verification in Progress",
        description: "Validating cryptographic signature and cross-referencing our secure certificate registry...",
        color: "text-primary",
        errorCode: null,
        helpText: null,
        actionable: false,
      };
    }

    if (error) {
      const errorMessage = (error as Error).message || "Unable to verify this certificate";
      const lowerMessage = errorMessage.toLowerCase();
      const isNotFound = lowerMessage.includes("not found");
      const isInvalidFormat = lowerMessage.includes("invalid") || lowerMessage.includes("format");
      const isRateLimit = lowerMessage.includes("rate") || lowerMessage.includes("too many");
      const isServiceError = lowerMessage.includes("unavailable") || lowerMessage.includes("service");

      if (isRateLimit) {
        return {
          icon: <RefreshCw className="w-16 h-16 text-orange-500" />,
          title: "Verification Rate Limit Exceeded",
          description: "To maintain system integrity and prevent abuse, we limit the number of verification attempts. Please wait briefly before trying again.",
          color: "text-orange-500",
          errorCode: ERROR_CODES.RATE_LIMITED,
          helpText: "This is a temporary restriction. Wait 60 seconds and try again.",
          actionable: true,
        };
      }

      if (isInvalidFormat) {
        return {
          icon: <FileWarning className="w-16 h-16 text-red-500" />,
          title: "Unrecognized Certificate ID Format",
          description: "The verification ID you entered does not match our expected format. Certificate IDs are alphanumeric codes in the format TM-XXXX-XXXX-XXXX, typically found at the bottom of your certificate.",
          color: "text-red-500",
          errorCode: ERROR_CODES.INVALID_FORMAT,
          helpText: "Check the certificate footer for the correct ID. It starts with 'TM-' followed by groups of letters and numbers.",
          actionable: true,
        };
      }

      if (isNotFound) {
        return {
          icon: <HelpCircle className="w-16 h-16 text-yellow-500" />,
          title: "Certificate Not Found",
          description: "We could not locate a certificate with this verification ID.",
          color: "text-yellow-500",
          errorCode: ERROR_CODES.NOT_FOUND,
          helpText: "Please verify the ID matches exactly what is printed on the certificate.",
          actionable: true,
        };
      }

      if (isServiceError) {
        return {
          icon: <ShieldAlert className="w-16 h-16 text-orange-500" />,
          title: "Verification Service Temporarily Unavailable",
          description: "Our certificate verification service is experiencing temporary issues. This does not reflect on the validity of any certificate.",
          color: "text-orange-500",
          errorCode: ERROR_CODES.UNKNOWN,
          helpText: "Please try again in a few moments. If the issue persists, contact support.",
          actionable: true,
        };
      }

      return {
        icon: <ShieldX className="w-16 h-16 text-destructive" />,
        title: "Verification Unsuccessful",
        description: errorMessage,
        color: "text-destructive",
        errorCode: ERROR_CODES.UNKNOWN,
        helpText: "If this error persists, please contact our support team with the error details.",
        actionable: false,
      };
    }

    if (!verificationResult) {
      return null;
    }

    if (verificationResult.verified) {
      return {
        icon: <ShieldCheck className="w-16 h-16 text-green-500 drop-shadow-lg" />,
        title: "Certificate Authenticated",
        description: "This certificate has been cryptographically verified as an authentic, unaltered document issued by TypeMasterAI. The achievement data below is officially confirmed.",
        color: "text-green-500",
        errorCode: null,
        helpText: null,
        actionable: false,
      };
    }

    // Specific failure reasons with detailed explanations
    if (!verificationResult.verificationStatus.signatureVerified) {
      return {
        icon: <ShieldOff className="w-16 h-16 text-red-600" />,
        title: "Digital Signature Verification Failed",
        description: "The cryptographic signature attached to this certificate does not match our records. This indicates the certificate data may have been modified after issuance, or the certificate was not issued by our official system.",
        color: "text-red-600",
        errorCode: ERROR_CODES.TAMPERED,
        helpText: "Warning: Do not trust certificates with failed signature verification. They may be fraudulent or tampered with.",
        actionable: false,
      };
    }

    if (!verificationResult.verificationStatus.notRevoked) {
      return {
        icon: <Ban className="w-16 h-16 text-orange-600" />,
        title: "Certificate Has Been Revoked",
        description: "This certificate was previously valid but has been officially revoked. Revocation may occur due to policy violations, user request, or detected irregularities in the original test.",
        color: "text-orange-600",
        errorCode: ERROR_CODES.REVOKED,
        helpText: "Revoked certificates are no longer valid representations of achievement. Contact support if you believe this was done in error.",
        actionable: false,
      };
    }

    if (!verificationResult.verificationStatus.notExpired) {
      return {
        icon: <CalendarX className="w-16 h-16 text-yellow-600" />,
        title: "Certificate Validity Period Expired",
        description: "This certificate has passed its validity period and is no longer considered current. The achievement was valid at the time of issuance but may not reflect current skills.",
        color: "text-yellow-600",
        errorCode: ERROR_CODES.EXPIRED,
        helpText: "Consider taking a new test to obtain a current certificate that reflects your present abilities.",
        actionable: true,
      };
    }

    return {
      icon: <ShieldX className="w-16 h-16 text-destructive" />,
      title: "Certificate Verification Failed",
      description: "This certificate could not be validated against our official records. One or more verification checks did not pass.",
      color: "text-destructive",
      errorCode: ERROR_CODES.UNKNOWN,
      helpText: "Review the verification details below to understand which checks failed.",
      actionable: false,
    };
  }, [isLoading, error, verificationResult]);

  const tierColors = verificationResult?.certificate?.tier
    ? TIER_COLORS[verificationResult.certificate.tier] || TIER_COLORS.Bronze
    : null;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4" data-testid="page-verify">
      {/* Back Button */}
      <div className="mb-2">
        <Link href="/">
          <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Header with Trust Indicators */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-6 ring-4 ring-primary/10">
          <Shield className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-3" data-testid="heading-verify">
          Certificate Verification
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-6">
          Verify the authenticity of TypeMasterAI certifications against our secure global registry.
        </p>

      </div>

      {/* Search Box - Professional Input */}
      <Card className="mb-8 border-primary/20 shadow-xl bg-card/50 backdrop-blur">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Search className="w-5 h-5 text-primary" />
            </div>
            Verify Certificate
          </CardTitle>
          <CardDescription className="text-base">
            Enter the verification ID from your certificate. This ID is located at the bottom of the certificate, next to the QR code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="TM-XXXX-XXXX-XXXX"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="font-mono text-lg tracking-wider h-14 pl-4 pr-12 border-2 focus:border-primary"
                maxLength={19}
                data-testid="input-verification-id"
              />
              {inputValue && (
                <button
                  onClick={() => setInputValue("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading || !inputValue.trim()}
              className="gap-2 px-8 h-14 font-semibold text-base shadow-lg"
              size="lg"
              data-testid="button-verify"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
              Verify
            </Button>
          </div>

          {/* Format Helper */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            <span>Example format: <code className="font-mono bg-muted px-1.5 py-0.5 rounded">TM-7K9M-4N2P-Q3RT</code></span>
          </div>
        </CardContent>
      </Card>



      {/* Verification Result */}
      {(searchId || verificationResult || error) && (
        <Card className="overflow-hidden shadow-xl border-t-4 data-[state=verified]:border-t-green-500 data-[state=failed]:border-t-red-500 transition-all duration-300">
          {/* Status Header */}
          <div
            className={`p-10 text-center ${verificationResult?.verified
              ? "bg-gradient-to-b from-green-500/10 to-green-500/5"
              : error || (verificationResult && !verificationResult.verified)
                ? "bg-gradient-to-b from-destructive/10 to-destructive/5"
                : "bg-gradient-to-b from-primary/10 to-primary/5"
              }`}
          >
            {statusDisplay && (
              <>
                {/* Status Icon with Animation */}
                <div className="flex justify-center mb-6">
                  <div
                    className={`p-4 rounded-full ${verificationResult?.verified
                      ? "bg-green-500/20 ring-4 ring-green-500/10"
                      : error || (verificationResult && !verificationResult.verified)
                        ? "bg-red-500/20 ring-4 ring-red-500/10"
                        : "bg-primary/20 ring-4 ring-primary/10"
                      } transition-all duration-500 animate-in fade-in zoom-in`}
                    role="img"
                    aria-label={statusDisplay.title}
                  >
                    {statusDisplay.icon}
                  </div>
                </div>

                {/* Status Title */}
                <h2
                  className={`text-3xl font-bold mb-3 ${statusDisplay.color}`}
                  data-testid="verification-status"
                  id="verification-result"
                >
                  {statusDisplay.title}
                </h2>

                {/* Status Description */}
                <p className="text-muted-foreground text-base max-w-xl mx-auto leading-relaxed" aria-describedby="verification-result">
                  {statusDisplay.description}
                </p>



                {/* Help Text Box (when actionable advice is available) */}
                {statusDisplay.helpText && (
                  <div className="mt-6 max-w-lg mx-auto">
                    <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border/50 text-left" role="alert">
                      <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {statusDisplay.helpText}
                      </p>
                    </div>
                  </div>
                )}



                {/* Retry Button for actionable errors */}
                {statusDisplay.actionable && error && (
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      onClick={() => refetch()}
                      className="gap-2"
                      aria-label="Retry verification"
                    >
                      <RefreshCw className="w-4 h-4" aria-hidden="true" />
                      Try Again
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Certificate Details */}
          {verificationResult?.certificate && (
            <CardContent className="p-8 space-y-8">






              {/* Certificate Info */}
              <div className="space-y-6">
                {/* Username & Type */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {verificationResult.certificate.username && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Awarded To</p>
                        <span className="font-bold text-xl">
                          {verificationResult.certificate.username}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Badge variant="secondary" className="px-3 py-1 text-sm bg-muted text-muted-foreground">
                      {CERTIFICATE_TYPE_NAMES[verificationResult.certificate.type] ||
                        verificationResult.certificate.type}
                    </Badge>
                    {tierColors && verificationResult.certificate.tier && (
                      <Badge className={`${tierColors.bg} ${tierColors.text} ${tierColors.border} border px-3 py-1 text-sm`}>
                        <Award className="w-3 h-3 mr-1" />
                        {verificationResult.certificate.tier} Tier
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-card border rounded-xl shadow-sm text-center">
                    <div className="flex items-center justify-center gap-2 text-primary mb-1">
                      <Zap className="w-5 h-5" />
                      <span className="text-3xl font-bold tracking-tight">{verificationResult.certificate.wpm}</span>
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">WPM</span>
                  </div>
                  <div className="p-4 bg-card border rounded-xl shadow-sm text-center">
                    <div className="flex items-center justify-center gap-2 text-green-500 mb-1">
                      <Target className="w-5 h-5" />
                      <span className="text-3xl font-bold tracking-tight">
                        {verificationResult.certificate.accuracy.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Accuracy</span>
                  </div>
                  <div className="p-4 bg-card border rounded-xl shadow-sm text-center">
                    <div className="flex items-center justify-center gap-2 text-purple-500 mb-1">
                      <Timer className="w-5 h-5" />
                      <span className="text-3xl font-bold tracking-tight">
                        {verificationResult.certificate.consistency}%
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Consistency</span>
                  </div>
                  <div className="p-4 bg-card border rounded-xl shadow-sm text-center">
                    <div className="flex items-center justify-center gap-2 text-cyan-500 mb-1">
                      <Clock className="w-5 h-5" />
                      <span className="text-3xl font-bold tracking-tight">
                        {formatDuration(verificationResult.certificate.duration)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Duration</span>
                  </div>
                </div>

                {/* Additional Metadata */}
                {verificationResult.certificate.metadata && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm p-4 rounded-lg bg-muted/30">
                    {verificationResult.certificate.metadata.programmingLanguage && (
                      <div className="flex justify-between border-b border-border/50 pb-2 md:border-b-0 md:pb-0">
                        <span className="text-muted-foreground">Language</span>
                        <span className="font-medium">{verificationResult.certificate.metadata.programmingLanguage}</span>
                      </div>
                    )}
                    {verificationResult.certificate.metadata.difficulty && (
                      <div className="flex justify-between border-b border-border/50 pb-2 md:border-b-0 md:pb-0">
                        <span className="text-muted-foreground">Difficulty</span>
                        <span className="font-medium">{verificationResult.certificate.metadata.difficulty}</span>
                      </div>
                    )}
                    {verificationResult.certificate.metadata.bookTitle && (
                      <div className="flex justify-between col-span-full border-b border-border/50 pb-2 md:border-b-0 md:pb-0">
                        <span className="text-muted-foreground">Book</span>
                        <span className="font-medium text-right">{verificationResult.certificate.metadata.bookTitle}</span>
                      </div>
                    )}
                    {verificationResult.certificate.metadata.author && (
                      <div className="flex justify-between col-span-full">
                        <span className="text-muted-foreground">Author</span>
                        <span className="font-medium text-right">{verificationResult.certificate.metadata.author}</span>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Issue Details - Enhanced Professional Layout */}
                <div className="bg-muted/20 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <Fingerprint className="w-4 h-4" />
                    Certificate Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
                        Issue Date & Time
                      </p>
                      <p className="font-semibold">
                        {formatDate(verificationResult.certificate.issuedAt)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
                        Verification ID
                      </p>
                      <p className="font-mono font-semibold text-primary">
                        {verificationResult.certificate.verificationId}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
                        Issuing Authority
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-semibold">{verificationResult.issuer.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/30">
                          OFFICIAL
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
                        Verified On
                      </p>
                      <p className="font-semibold text-green-600">
                        {new Date().toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions - Professional Styling */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={copyVerificationUrl}
                    className="gap-2 flex-1 h-12 font-semibold border-2"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Link Copied!" : "Copy Verification Link"}
                  </Button>
                  <Button
                    variant="default"
                    asChild
                    className="gap-2 flex-1 h-12 font-semibold shadow-lg"
                  >
                    <a href={verificationResult.issuer.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Visit {verificationResult.issuer.name}
                    </a>
                  </Button>
                </div>

                {/* Verification Count (if available) */}
                {verificationResult.verificationCount > 0 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">
                      This certificate has been verified <span className="font-semibold text-foreground">{verificationResult.verificationCount}</span> time{verificationResult.verificationCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          )
          }
        </Card >
      )}

      {/* QR Scan Verification Overlay - Professional Animation */}
      {
        params.verificationId && isLoading && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[100] flex items-center justify-center transition-all duration-300">
            <div className="text-center p-10 bg-card/95 border-2 border-primary/20 shadow-2xl rounded-3xl max-w-md w-full mx-4 relative overflow-hidden">
              {/* Gloss Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

              {/* Animated Verification Icon */}
              <div className="relative mb-8 flex justify-center items-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative z-10">
                    <QrCode className="w-12 h-12 text-primary" />
                  </div>
                  {/* Spinner */}
                  <div className="absolute inset-0 -m-2 z-20">
                    <div className="w-full h-full border-4 border-primary/20 border-t-primary rounded-2xl animate-spin" />
                  </div>
                  {/* Pulsing Ring */}
                  <div className="absolute inset-0 -m-4 z-0">
                    <div className="w-full h-full border-2 border-primary/10 rounded-3xl animate-ping" />
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-3 tracking-tight">Verifying Certificate</h3>

              {/* Progress Steps */}
              <div className="space-y-2 text-sm text-muted-foreground mb-6">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Validating cryptographic signature...</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span>Checking certificate registry...</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: "0.4s" }} />
                  <span>Verifying authenticity...</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Certificate ID: <code className="font-mono bg-muted px-2 py-0.5 rounded">{params.verificationId}</code>
              </p>
            </div>
          </div>
        )
      }
    </div >
  );
}

