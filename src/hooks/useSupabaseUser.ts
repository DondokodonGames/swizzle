import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Returns the current Supabase auth user without depending on the
 * useAuth() React context.
 *
 * useAuth() throws when no <AuthProvider> is mounted, which only happens
 * when VITE_ENABLE_AUTH === 'true' (see src/App.tsx). Top-level routed
 * pages are not guaranteed to be wrapped in it, so — matching the pattern
 * ProfilePage.tsx already uses — this hook talks to supabase.auth directly
 * and works regardless of that flag.
 */
export function useSupabaseUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
