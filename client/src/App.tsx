import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ErrorBoundary } from "@/components/error-boundary";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import ProfileEdit from "@/pages/profile-edit";
import Leaderboard from "@/pages/leaderboard";
import Settings from "@/pages/settings";
import Chat from "@/pages/chat";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Analytics from "@/pages/analytics";
import Multiplayer from "@/pages/multiplayer";
import Race from "@/pages/race";
import CodeMode from "@/pages/code-mode";
import CodeLeaderboard from "@/pages/code-leaderboard";
import BookMode from "@/pages/book-mode";
import SharedResult from "@/pages/shared-result";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsOfService from "@/pages/terms-of-service";
import CookiePolicy from "@/pages/cookie-policy";
import About from "@/pages/about";
import Contact from "@/pages/contact";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/share/:shareId" component={SharedResult} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/profile" component={Profile} />
            <Route path="/profile/edit" component={ProfileEdit} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/multiplayer" component={Multiplayer} />
            <Route path="/race/:id" component={Race} />
            <Route path="/code-mode" component={CodeMode} />
            <Route path="/code-leaderboard" component={CodeLeaderboard} />
            <Route path="/books" component={BookMode} />
            <Route path="/chat" component={Chat} />
            <Route path="/settings" component={Settings} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/terms-of-service" component={TermsOfService} />
            <Route path="/cookie-policy" component={CookiePolicy} />
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
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
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
