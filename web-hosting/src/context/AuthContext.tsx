import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signUp: (username: string, password: string, displayName: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SYNTHETIC_DOMAIN = 'gdg-go.local';

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_DOMAIN}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error: profileErr } = await supabase
        .from('users')
        .select('id, username, display_name')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        console.warn('[Auth] Profile fetch warning:', profileErr.message);
        return null;
      }
      return data as UserProfile;
    } catch (e) {
      console.warn('[Auth] Exception fetching profile:', e);
      return null;
    }
  };

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        let userProfile = await fetchProfile(session.user.id);
        if (!userProfile) {
          const fallbackUsername = session.user.email?.split('@')[0] || 'driver';
          userProfile = {
            id: session.user.id,
            username: fallbackUsername,
            display_name: fallbackUsername,
          };
          await supabase.from('users').upsert(userProfile);
        }
        setProfile(userProfile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        let userProfile = await fetchProfile(newSession.user.id);
        if (!userProfile) {
          const fallbackUsername = newSession.user.email?.split('@')[0] || 'driver';
          userProfile = {
            id: newSession.user.id,
            username: fallbackUsername,
            display_name: fallbackUsername,
          };
        }
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (username: string, password: string, displayName: string) => {
    setError(null);
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();
    const email = usernameToEmail(cleanUsername);

    try {
      // 1. Check if username is already taken in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        throw new Error('This username is already taken. Please choose another one.');
      }

      // 2. Auth Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Sign up could not be completed. Please try again.');
      }

      // If signUp didn't automatically establish a session, sign in immediately
      if (!authData.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) {
          console.warn('[Auth] Auto sign-in warning:', signInErr.message);
        }
      }

      // 3. Upsert public.users profile row
      const newProfile: UserProfile = {
        id: authData.user.id,
        username: cleanUsername,
        display_name: cleanDisplayName || cleanUsername,
      };

      const { error: profileError } = await supabase
        .from('users')
        .upsert(newProfile);

      if (profileError) {
        console.warn('[Auth] Profile creation warning:', profileError.message);
      }

      setProfile(newProfile);
    } catch (err: any) {
      const msg = err?.message || 'Failed to sign up';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    setError(null);
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const email = usernameToEmail(cleanUsername);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect username or password.');
        }
        throw new Error(authError.message);
      }

      if (data.user) {
        let userProfile = await fetchProfile(data.user.id);
        if (!userProfile) {
          userProfile = {
            id: data.user.id,
            username: cleanUsername,
            display_name: cleanUsername,
          };
          await supabase.from('users').upsert(userProfile);
        }
        setProfile(userProfile);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to sign in';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.warn('[Auth] Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
