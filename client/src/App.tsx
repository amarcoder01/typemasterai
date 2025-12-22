import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { NetworkProvider } from "@/lib/network-context";
import { ErrorProvider } from "@/lib/error-context";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { ErrorBoundary } from "@/components/error-boundary";
import { AchievementCelebrationProvider } from "@/components/achievement-celebration";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import Layout from "@/components/layout";
import { NotificationSync } from "@/components/NotificationSync";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import ProfileEdit from "@/pages/profile-edit";
import Leaderboard from "@/pages/leaderboard";
import Settings from "@/pages/settings";
import Chat from "@/pages/chat";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VerifyEmail from "@/pages/verify-email";
import Analytics from "@/pages/analytics";
import Multiplayer from "@/pages/multiplayer";
import Race from "@/pages/race";
import CodeMode from "@/pages/code-mode";
import CodeLeaderboard from "@/pages/code-leaderboard";
import BookMode from "@/pages/book-mode";
import BookLibrary from "@/pages/book-library";
import BookDetail from "@/pages/book-detail";
import ChapterTyping from "@/pages/chapter-typing";
import DictationTest from "@/pages/dictation-test";
import DictationMode from "@/pages/dictation-mode";
import StressTest from "@/pages/stress-test";
import StressLeaderboard from "@/pages/stress-leaderboard";
import SharedResult from "@/pages/shared-result";
import Result from "@/pages/result";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import CookiePolicy from "@/pages/cookie-policy";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Verify from "@/pages/verify";
import NotificationSettings from "@/pages/NotificationSettings";
import TypingTest1Min from "@/pages/typing-test-1-min";
import TypingTest3Min from "@/pages/typing-test-3-min";
import TypingTest5Min from "@/pages/typing-test-5-min";
import MonkeytypeAlternative from "@/pages/monkeytype-alternative";
import TyperacerAlternative from "@/pages/typeracer-alternative";
import TenFastFingersAlternative from "@/pages/10fastfingers-alternative";
import TypingComAlternative from "@/pages/typingcom-alternative";
import AdminFeedbackDashboard from "@/pages/admin/feedback";
import Learn from "@/pages/learn";
import AITransparency from "@/pages/ai-transparency";
import AccessibilityStatement from "@/pages/accessibility";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/share/:shareId" component={SharedResult} />
      <Route path="/result/:shareToken" component={Result} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/1-minute-typing-test" component={TypingTest1Min} />
            <Route path="/3-minute-typing-test" component={TypingTest3Min} />
            <Route path="/5-minute-typing-test" component={TypingTest5Min} />
            <Route path="/monkeytype-alternative" component={MonkeytypeAlternative} />
            <Route path="/typeracer-alternative" component={TyperacerAlternative} />
            <Route path="/10fastfingers-alternative" component={TenFastFingersAlternative} />
            <Route path="/typingcom-alternative" component={TypingComAlternative} />
            <Route path="/profile" component={Profile} />
            <Route path="/profile/edit" component={ProfileEdit} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/multiplayer" component={Multiplayer} />
            <Route path="/race/:id" component={Race} />
            <Route path="/code-mode" component={CodeMode} />
            <Route path="/code-leaderboard" component={CodeLeaderboard} />
            <Route path="/book-mode" component={BookMode} />
            <Route path="/dictation-mode" component={DictationMode} />
            <Route path="/dictation-test" component={DictationTest} />
            <Route path="/stress-test" component={StressTest} />
            <Route path="/stress-leaderboard" component={StressLeaderboard} />
            <Route path="/books/:slug/chapter/:chapterNum" component={ChapterTyping} />
            <Route path="/books/:slug" component={BookDetail} />
            <Route path="/books" component={BookLibrary} />
            <Route path="/chat" component={Chat} />
            <Route path="/settings" component={Settings} />
            <Route path="/notifications" component={NotificationSettings} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/terms-of-service" component={TermsOfService} />
            <Route path="/cookie-policy" component={CookiePolicy} />
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
            <Route path="/verify" component={Verify} />
            <Route path="/verify/:verificationId" component={Verify} />
            <Route path="/learn" component={Learn} />
            <Route path="/ai-transparency" component={AITransparency} />
            <Route path="/accessibility" component={AccessibilityStatement} />
            <Route path="/admin/feedback" component={AdminFeedbackDashboard} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NetworkProvider>
            <ErrorProvider>
              <AuthProvider>
                <AchievementCelebrationProvider>
                  <TooltipProvider>
                    <NetworkStatusBanner />
                    <Toaster />
                    <SonnerToaster
                      position="top-right"
                      richColors
                      closeButton
                      toastOptions={{
                        duration: 5000,
                        className: "font-sans",
                      }}
                    />
                    <NotificationSync />
                    <Router />
                    <CookieConsentBanner />
                  </TooltipProvider>
                </AchievementCelebrationProvider>
              </AuthProvider>
            </ErrorProvider>
          </NetworkProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
