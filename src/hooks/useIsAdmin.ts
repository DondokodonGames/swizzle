import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Returns whether the currently authenticated user has admin privileges.
 *
 * Primary:  calls the `is_admin()` Supabase RPC (requires migration
 *           20260512_profiles_is_admin.sql to be applied).
 * Fallback: compares user.id against VITE_ADMIN_USER_ID env var so that
 *           existing deployments keep working before the migration is run.
 *           Once the migration is applied and is_admin = true is set in the
 *           profiles table, the env var can be removed from the build.
 */
export function useIsAdmin(user: User | null): { isAdmin: boolean; adminLoading: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;
    setAdminLoading(true);

    supabase.rpc('is_admin').then(({ data, error }: { data: boolean | null; error: unknown }) => {
      if (cancelled) return;
      if (!error) {
        setIsAdmin(data === true);
      } else {
        // RPC not yet available (migration pending) – fall back to env var
        const adminId = import.meta.env.VITE_ADMIN_USER_ID as string | undefined;
        setIsAdmin(!!adminId && user.id === adminId);
      }
      setAdminLoading(false);
    });

    return () => { cancelled = true; };
  }, [user?.id]);

  return { isAdmin, adminLoading };
}
