-- Fix: reaction_counts view was SECURITY DEFINER, bypassing RLS on reactions table.
-- Explicitly set security_invoker = true (PostgreSQL 15+).

ALTER VIEW public.reaction_counts SET (security_invoker = true);

-- Ensure read access for authenticated and anonymous users
GRANT SELECT ON public.reaction_counts TO authenticated, anon;
