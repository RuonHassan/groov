import { TaskProvider } from "./contexts/TaskContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import CalendarPage from "@/pages/CalendarPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import UpdatePasswordPage from "@/pages/UpdatePasswordPage";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import { WeekProvider } from "./contexts/WeekContext";
import Layout from "@/components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { GoogleCalendarProvider } from "./contexts/GoogleCalendarContext";
import { OutlookCalendarProvider } from "./contexts/OutlookCalendarContext";
import GoogleCalendarCallback from '@/components/GoogleCalendarCallback';
import OutlookCalendarCallback from '@/components/OutlookCalendarCallback';

// Component to protect routes
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a proper spinner component
  }

  if (!session) {
    return <Redirect to="/login" />; // Redirect to login page instead of landing
  }

  return <>{children}</>;
};

function Router() {
  return (
    <Switch>
      {/* Public routes - no Layout wrapper */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/update-password" component={UpdatePasswordPage} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      
      {/* Protected routes - with Layout wrapper */}
      <Route path="/app">
        <PrivateRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </PrivateRoute>
      </Route>
      <Route path="/calendar">
        <PrivateRoute>
          <Layout>
            <CalendarPage />
          </Layout>
        </PrivateRoute>
      </Route>

      {/* OAuth Callback routes */}
      <Route path="/auth/google/callback">
        <GoogleCalendarCallback />
      </Route>
      <Route path="/auth/outlook/callback">
        <OutlookCalendarCallback />
      </Route>

      {/* 404 route */}
      <Route default>
        <NotFound />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WeekProvider>
          <TaskProvider>
            <GoogleCalendarProvider>
              <OutlookCalendarProvider>
                <Router />
                <Toaster />
              </OutlookCalendarProvider>
            </GoogleCalendarProvider>
          </TaskProvider>
        </WeekProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
