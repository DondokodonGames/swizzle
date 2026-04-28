-- Fix: reaction_counts view was SECURITY DEFINER, bypassing RLS on reactions table.
-- Recreate as SECURITY INVOKER (the default) so the querying user's permissions apply.

DROP VIEW IF EXISTS public.reaction_counts;

CREATE VIEW public.reaction_counts AS
SELECT
    game_id,
    reaction_type,
    count(*) AS count
FROM reactions
GROUP BY game_id, reaction_type;

-- Allow read access for authenticated and anonymous users
GRANT SELECT ON public.reaction_counts TO authenticated, anon;
