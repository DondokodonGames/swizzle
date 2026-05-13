import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Returns whether the currently authenticated user has is_admin = true.
 * The check is performed server-side via the `is_admin()` RPC so that
 * no admin UUID is ever baked into the client bundle.
 * Retries once after 1.5s on transient failure (cold start / network blip).
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

    const attempt = (retryOnError: boolean) => {
      supabase.rpc('is_admin').then(({ data, error }: { data: boolean | null; error: unknown }) => {
        if (cancelled) return;
        if (!error) {
          setIsAdmin(data === true);
          setAdminLoading(false);
        } else if (retryOnError) {
          // 1回だけリトライ（コールドスタート・一時的ネットワーク障害対策）
          setTimeout(() => attempt(false), 1500);
        } else {
          // リトライも失敗したら諦めてローディング解除（isAdmin は false のまま）
          setAdminLoading(false);
        }
      });
    };

    attempt(true);

    return () => { cancelled = true; };
  }, [user?.id]);

  return { isAdmin, adminLoading };
}
