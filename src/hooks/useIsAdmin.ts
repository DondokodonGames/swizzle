import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Returns whether the currently authenticated user has is_admin = true.
 * The check is performed server-side via the `is_admin()` RPC so that
 * no admin UUID is ever baked into the client bundle.
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
      if (!error) setIsAdmin(data === true);
      setAdminLoading(false);
    });

    return () => { cancelled = true; };
  }, [user?.id]);

  return { isAdmin, adminLoading };
}
