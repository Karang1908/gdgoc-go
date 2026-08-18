import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchUserCumulativeStats, DriverStats } from '../lib/api';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  userCoins: number;
  userGdgCoins: number;
  userStats: DriverStats | null;
  loading: boolean;
  error: string | null;
  signUp: (username: string, email: string, password: string, displayName: string) => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCoins: () => Promise<void>;
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
  const [userCoins, setUserCoins] = useState<number>(0);
  const [userGdgCoins, setUserGdgCoins] = useState<number>(0);
  const [userStats, setUserStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const refreshCoins = useCallback(async () => {
    if (!user) {
      // Check local guest coins
      const guestBonusGdg = parseInt(localStorage.getItem('gdg_coins_bonus_guest') || '0', 10) || 0;
      setUserCoins(0);
      setUserGdgCoins(guestBonusGdg);
      return;
    }

    try {
      const stats = await fetchUserCumulativeStats(user.id, profile?.username);
      setUserCoins(stats.totalCoins);
      setUserGdgCoins(stats.totalGdgCoins);
      setUserStats(stats);
    } catch (e) {
      console.warn('[Auth] Error fetching cumulative coin stats:', e);
    }
  }, [user, profile]);

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error: profileErr } = await supabase
        .from('users')
        .select('id, username, display_name, email')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        // Fallback without email column if table doesn't have it yet
        const { data: fallbackData } = await supabase
          .from('users')
          .select('id, username, display_name')
          .eq('id', userId)
          .maybeSingle();
        return fallbackData as UserProfile;
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
          const fallbackUsername = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'driver';
          userProfile = {
            id: session.user.id,
            username: fallbackUsername,
            display_name: session.user.user_metadata?.display_name || fallbackUsername,
            email: session.user.email || undefined,
          };
          await supabase.from('users').upsert(userProfile);
        }
        setProfile(userProfile);
        const stats = await fetchUserCumulativeStats(session.user.id, userProfile.username);
        setUserCoins(stats.totalCoins);
        setUserGdgCoins(stats.totalGdgCoins);
        setUserStats(stats);
      } else {
        const guestBonusGdg = parseInt(localStorage.getItem('gdg_coins_bonus_guest') || '0', 10) || 0;
        setUserCoins(0);
        setUserGdgCoins(guestBonusGdg);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        let userProfile = await fetchProfile(newSession.user.id);
        if (!userProfile) {
          const fallbackUsername = newSession.user.user_metadata?.username || newSession.user.email?.split('@')[0] || 'driver';
          userProfile = {
            id: newSession.user.id,
            username: fallbackUsername,
            display_name: newSession.user.user_metadata?.display_name || fallbackUsername,
          };
        }
        setProfile(userProfile);
        const stats = await fetchUserCumulativeStats(newSession.user.id, userProfile.username);
        setUserCoins(stats.totalCoins);
        setUserGdgCoins(stats.totalGdgCoins);
        setUserStats(stats);
      } else {
        setProfile(null);
        setUserCoins(0);
        setUserGdgCoins(0);
        setUserStats(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (username: string, userEmail: string, password: string, displayName: string) => {
    setError(null);
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();
    const cleanEmail = userEmail.trim().toLowerCase();

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

      // 2. Auth Sign Up with user's validated email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            display_name: cleanDisplayName || cleanUsername,
          },
        },
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
          email: cleanEmail,
          password,
        });
        if (signInErr) {
          console.warn('[Auth] Auto sign-in warning:', signInErr.message);
        }
      }

      // 3. Upsert public.users profile row (including email)
      const newProfile: UserProfile = {
        id: authData.user.id,
        username: cleanUsername,
        display_name: cleanDisplayName || cleanUsername,
        email: cleanEmail,
      };

      const { error: profileError } = await supabase
        .from('users')
        .upsert(newProfile);

      if (profileError) {
        console.warn('[Auth] Profile creation with email warning:', profileError.message);
        // Fallback without email column in case migration hasn't run yet
        const fallbackProfile = {
          id: authData.user.id,
          username: cleanUsername,
          display_name: cleanDisplayName || cleanUsername,
        };
        await supabase.from('users').upsert(fallbackProfile);
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

  const signIn = async (identifier: string, password: string) => {
    setError(null);
    setLoading(true);

    const cleanInput = identifier.trim();
    const isEmail = cleanInput.includes('@');
    const primaryEmail = isEmail ? cleanInput.toLowerCase() : usernameToEmail(cleanInput.toLowerCase());

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: primaryEmail,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect username/email or password.');
        }
        throw new Error(authError.message);
      }

      if (data.user) {
        let userProfile = await fetchProfile(data.user.id);
        if (!userProfile) {
          const fallbackUsername = data.user.user_metadata?.username || cleanInput.toLowerCase();
          userProfile = {
            id: data.user.id,
            username: fallbackUsername,
            display_name: data.user.user_metadata?.display_name || fallbackUsername,
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
        userCoins,
        userGdgCoins,
        userStats,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        refreshCoins,
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
