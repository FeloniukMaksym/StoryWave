import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
export const STORED_GOOGLE_REFRESH_TOKEN_KEY = 'sw_google_refresh_token';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setLoading(false);

      // Supabase drops provider_refresh_token after JWT refresh — persist it ourselves
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.provider_refresh_token) {
        localStorage.setItem(STORED_GOOGLE_REFRESH_TOKEN_KEY, newSession.provider_refresh_token);
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(STORED_GOOGLE_REFRESH_TOKEN_KEY);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: GOOGLE_DRIVE_SCOPE,
        redirectTo: `${window.location.origin}/library`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signOut,
  };
}
