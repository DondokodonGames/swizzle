# Operations — Backup / Disaster Recovery (WP60 P0-5)

## Bootstrapping a fresh Supabase project from migrations

`supabase/migrations/` now contains everything needed to stand up a fresh
project's schema (see `20260101_schema_drift_backfill.sql` for the full
rationale — most tables existed in production without a corresponding
migration until that backfill was added). Apply in filename order, with one
manual exception documented below.

```bash
supabase link --project-ref <new-project-ref>
supabase db push
```

### Known ordering exception

The four `20260321_*` migrations share the same date prefix, so a plain
alphabetical apply order is wrong: `20260321_billing_transition_hardening.sql`
references `credit_purchases`/`subscriptions`, which
`20260321_pay_per_play.sql` creates. If you are applying migrations manually
(rather than trusting `supabase db push`'s internal version ordering, which
uses the full migration version recorded at creation time, not just the
visible filename prefix), apply them in this order:

1. `20260321_pay_per_play.sql`
2. `20260321_pay_per_play_rls_hardening.sql`
3. `20260321_billing_transition_hardening.sql`
4. `20260321_security_hardening.sql`

This was verified by applying every migration in `supabase/migrations/`
end-to-end against a scratch PostgreSQL 16 database (with `auth.users`,
`auth.uid()`, and the `anon`/`authenticated`/`service_role` roles stubbed to
match Supabase's environment) — all 22 expected tables were created with no
errors, confirming the migration set is complete and correctly ordered with
this one exception noted.

## Backup / PITR — TODO (human decision required)

The following needs to be confirmed against the actual Supabase project
plan/tier before this section can be considered complete:

- [ ] Confirm current Supabase plan (Free / Pro / Team) and whether Point-in-Time
      Recovery (PITR) is available and enabled.
- [ ] Document the PITR retention window (Supabase Pro: 7 days by default,
      configurable up to 28 days as an add-on).
- [ ] Document the manual backup cadence if PITR is not available on the
      current plan (Free tier: daily backups retained 7 days, not
      user-triggerable point-in-time restore).
- [ ] Write the actual restore runbook (Dashboard → Database → Backups →
      Restore, or `supabase db dump` / `pg_restore` for self-managed backups)
      including who is authorized to trigger a restore and the rollback plan
      for the application (which migrations would need re-applying after a
      restore that predates them).
- [ ] Decide and document a retention/export policy for `analytics_events`
      and `payments`/`credit_purchases` history if they need to outlive the
      PITR window for accounting purposes.

This section was scoped in `docs/work-plans/60-platform-gaps-roadmap.md`
P0-5 as requiring human input on the actual billing/plan decision — the
migration-bootstrap half of P0-5 (above) is done; this half is not.
