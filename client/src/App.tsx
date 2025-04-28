import { TaskProvider } from "./contexts/TaskContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import CalendarPage from "@/pages/CalendarPage";
import PomodoroPage from "@/pages/PomodoroPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import UpdatePasswordPage from "@/pages/UpdatePasswordPage";
import { WeekProvider } from "./contexts/WeekContext";
import Layout from "@/components/Layout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { GoogleCalendarProvider } from "./contexts/GoogleCalendarContext";
import GoogleCalendarCallback from '@/components/GoogleCalendarCallback';

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
      <Route path="/pomodoro">
        <PrivateRoute>
          <Layout>
            <PomodoroPage />
          </Layout>
        </PrivateRoute>
      </Route>

      {/* OAuth Callback routes */}
      <Route path="/auth/google/callback">
        <GoogleCalendarCallback />
      </Route>

      {/* 404 route */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleCalendarProvider>
          <TaskProvider>
            <WeekProvider>
              <Router />
              <Toaster />
            </WeekProvider>
          </TaskProvider>
        </GoogleCalendarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
