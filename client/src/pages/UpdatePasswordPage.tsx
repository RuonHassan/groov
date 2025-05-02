import { useState, useEffect } from "react";
import { Redirect, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [redirectToLogin, setRedirectToLogin] = useState(false);
  const [validResetLink, setValidResetLink] = useState(true);

  // Check if we have access token in the URL (from reset password email)
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      // If no session and no hash in URL, this is not a valid reset link
      if (!data.session && !window.location.hash) {
        setValidResetLink(false);
      }
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setRedirectToLogin(true);
      }, 3000);
    } catch (error: any) {
      setError(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (redirectToLogin) {
    return <Redirect to="/login" />;
  }

  if (!validResetLink) {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center p-4">
        <Link href="/">
          <img 
            src="/groov.png" 
            alt="Groov Logo" 
            className="h-12 w-auto mb-8 cursor-pointer"
          />
        </Link>

        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-red-600 text-center">Invalid Reset Link</CardTitle>
            <CardDescription className="text-center">
              This link is invalid or expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button 
              onClick={() => window.location.href = "/reset-password"}
              className="mt-4"
            >
              Request New Reset Link
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white items-center justify-center p-4">
      <Link href="/">
        <img 
          src="/groov.png" 
          alt="Groov Logo" 
          className="h-24 w-auto mb-8 cursor-pointer"
        />
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Update Password</CardTitle>
          {!success && (
            <CardDescription className="text-center">
              Enter your new password below
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="bg-green-50 border-green-600 text-green-800">
              <AlertDescription className="text-center">
                Password updated! Redirecting to login...
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Password must be at least 6 characters long
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 