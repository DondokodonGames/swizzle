-- Add is_admin column to profiles
--
-- Only service_role (backend / Supabase dashboard) may set is_admin = true.
-- Authenticated users are explicitly blocked from self-promoting via
-- a WITH CHECK constraint on their own UPDATE policy.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Authenticated users can read their own is_admin flag
-- (needed for the useIsAdmin hook)
-- If profiles already has an RLS policy for SELECT, this may already be covered.
-- Using DO block to avoid duplicate-policy errors.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_select_own'
  ) THEN
    CREATE POLICY "profiles_select_own" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- Authenticated users may update their own profile columns,
-- but is_admin must remain unchanged (enforced by WITH CHECK).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY "profiles_update_own" ON public.profiles
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (
        auth.uid() = id
        -- Prevent self-promotion: the new row's is_admin must equal the existing value
        AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

-- Convenience function: returns true when the calling JWT belongs to an admin.
-- SECURITY DEFINER so it can read profiles even with restrictive RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
