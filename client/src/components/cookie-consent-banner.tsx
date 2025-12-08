import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Cookie, X, Settings } from "lucide-react";

const COOKIE_CONSENT_KEY = "typemasterai_cookie_consent";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
        if (parsed.timestamp < sixMonthsAgo) {
          setShowBanner(true);
        }
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    });
  };

  const rejectAll = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    });
  };

  const saveCustom = () => {
    savePreferences({
      ...preferences,
      timestamp: Date.now(),
    });
  };

  if (!showBanner) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg"
      role="dialog"
      aria-label="Cookie consent"
      aria-describedby="cookie-consent-description"
    >
      <div className="container mx-auto px-4 py-4">
        {!showSettings ? (
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p id="cookie-consent-description" className="text-sm text-muted-foreground">
                  We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.{" "}
                  <Link href="/cookie-policy" className="text-primary hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="text-xs"
                data-testid="button-cookie-settings"
              >
                <Settings className="w-3 h-3 mr-1" />
                Customize
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={rejectAll}
                className="text-xs"
                data-testid="button-cookie-reject"
              >
                Reject All
              </Button>
              <Button
                size="sm"
                onClick={acceptAll}
                className="text-xs"
                data-testid="button-cookie-accept"
              >
                Accept All
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Cookie className="w-4 h-4 text-primary" />
                Cookie Preferences
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(false)}
                className="h-6 w-6"
                aria-label="Close cookie settings"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-2 rounded-lg bg-accent/30">
                <input
                  type="checkbox"
                  id="necessary"
                  checked={true}
                  disabled
                  className="mt-1"
                  aria-describedby="necessary-desc"
                />
                <div>
                  <label htmlFor="necessary" className="text-sm font-medium">
                    Necessary Cookies
                  </label>
                  <p id="necessary-desc" className="text-xs text-muted-foreground">
                    Required for the website to function properly. Cannot be disabled.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/20">
                <input
                  type="checkbox"
                  id="analytics"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="mt-1"
                  aria-describedby="analytics-desc"
                />
                <div>
                  <label htmlFor="analytics" className="text-sm font-medium cursor-pointer">
                    Analytics Cookies
                  </label>
                  <p id="analytics-desc" className="text-xs text-muted-foreground">
                    Help us understand how visitors interact with our website.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/20">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  className="mt-1"
                  aria-describedby="marketing-desc"
                />
                <div>
                  <label htmlFor="marketing" className="text-sm font-medium cursor-pointer">
                    Marketing Cookies
                  </label>
                  <p id="marketing-desc" className="text-xs text-muted-foreground">
                    Used to track visitors across websites for marketing purposes.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={rejectAll}
                className="text-xs"
                data-testid="button-cookie-reject-custom"
              >
                Reject All
              </Button>
              <Button
                size="sm"
                onClick={saveCustom}
                className="text-xs"
                data-testid="button-cookie-save"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function useCookieConsent() {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch {
        setPreferences(null);
      }
    }
  }, []);

  return preferences;
}
