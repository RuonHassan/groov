import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User, Provider, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient'; // Use existing client

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithEmail: (credentials: SignInWithPasswordCredentials) => Promise<void>;
  signUpWithEmail: (credentials: SignUpWithPasswordCredentials) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error.message);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Set loading to false once auth state is confirmed
    });

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
    // State updates handled by onAuthStateChange
  };

  // Sign in with Email/Password
  const signInWithEmail = async (credentials: SignInWithPasswordCredentials) => {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
      console.error('Error signing in:', error.message);
      throw error; // Re-throw error to handle it in the UI
    }
    // Redirect/state updates handled by onAuthStateChange
  };

  // Sign up with Email/Password
  const signUpWithEmail = async (credentials: SignUpWithPasswordCredentials) => {
     // Optionally add options like email confirmation redirect URL
    const { data, error } = await supabase.auth.signUp(credentials);
    if (error) {
      console.error('Error signing up:', error.message);
      throw error; // Re-throw error to handle it in the UI
    }
    // Handle successful sign up (e.g., show message about email confirmation)
    console.log('Sign up successful, check email for confirmation:', data);
    // State updates handled by onAuthStateChange after confirmation (if enabled)
  };

  const value = {
    session,
    user,
    loading,
    signOut,
    signInWithEmail,
    signUpWithEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} {/* Render children only when not loading */}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 