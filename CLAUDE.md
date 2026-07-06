# Swizzle — Codebase Reference

Short mini-game platform (5–30 second games). Users play and create games. An AI pipeline (Claude/Codex) batch-generates games from "neta" idea JSON files.

**Stack:** React + Canvas 2D + Supabase (auth + DB) + Vite + TypeScript

> Rendering is **Canvas 2D** (`getContext('2d')`), not WebGL/PixiJS. The earlier `pixi.js` dependency was unused (zero imports in `src/`) and has been removed. If a future WebGL migration is planned, record it here first.

---

## Key Commands

```bash
npm run dev           # Vite dev server
npm run build         # TypeScript + Vite build
npm run test          # Vitest (single pass)
npm run lint          # ESLint
npx tsc --noEmit --skipLibCheck   # Type check only

# AI generation
npm run ai:v2:1       # Generate 1 game
npm run ai:neta:1     # Generate 1 game from neta idea list
npm run ai:status     # Generation progress & quality stats
npm run ai:neta:trend # Convert pasted SNS trends (trend-sources.json) into netas
DRY_RUN=true npm run ai:v2:1          # Skip LLM/asset API calls
SKIP_UPLOAD=true npm run ai:neta:1    # Skip Supabase upload

# Code games (the 800 examples)
npm run games:smoke   # Runtime smoke test + screenshot contact sheet (Playwright)
npm run ai:upload:examples            # Upload examples (OVERWRITE=true to update, PRICE_SYNC=true for tier pricing)
```

### Code-game quality standard v2

The 800 code games (`src/ai/code/examples/*.js`) target **quality standard v2**. The canon:
- `docs/specifications/GAME_QUALITY_STANDARD_V2.md` — pass bar (scorer ≥80 + smoke PASS)
- `docs/specifications/SANDBOX_API_V2.md` — the full `game.*` API (WebAudio chiptune synth, `game.feedback.good/bad`, multi-touch, sprites) + recipes
- `docs/specifications/MECHANICS_CATALOG_V2.md` — 40 mechanics with API mapping (use for neta assignment / `@mechanic` headers)
- `docs/specifications/ARCADE_ART_DIRECTION.md` — in-game art direction (era style packs, coin-op feel)
- `docs/work-plans/56-quality-v2-batch-template.md` — fill-in prompt for batch rewrite sessions

The sandbox engine is `src/services/code-game/iframeTemplate.ts` (ships with the app bundle — engine changes apply to all uploaded games without re-upload). Missing `se_*`/`bgm_*` audio assets fall back to synthesized presets, so games are never silent.

---

## Critical Architecture Rules

### contract.ts is the single source of truth
`src/types/editor/contract.ts` defines all valid action/condition types. **Never** add types to validator arrays, `platform_constraints.json`, or spec docs without first adding them to `contract.ts`. The consistency test enforces this:
- `src/types/editor/__tests__/contract.consistency.test.ts`

### AI-excluded actions
`bindAnimationToCounter` and `setInputZoneEnabled` are in `ALL_ACTION_TYPES` but excluded from `GENERATABLE_ACTIONS`. The AI must not generate these directly.

### Game loop order
```
physics → effects → animations → frameState
  → delayScheduler.tick()
  → evaluateAndExecuteRules()
  → tickBindings()
  → draw
```

---

## Important Files

| Path | Purpose |
|------|---------|
| `src/types/editor/contract.ts` | Single source of truth for all action/condition types |
| `src/types/editor/GameScript.ts` | Core types: GameAction, TriggerCondition, GameRule, InputZone |
| `src/services/rule-engine/` | Engine: RuleEngine, ConditionEvaluator, ActionExecutor, DelayScheduler |
| `src/services/editor/EditorGameBridge.ts` | Connects game engine to React editor UI and game loop |
| `src/ai/v2/Orchestrator.ts` | 9-step AI pipeline (Concept → QualityScorer) |
| `src/ai/v2/SpecificationGenerator.ts` | Generates game spec prompts for Claude/GPT |
| `src/ai/v2/LogicValidator.ts` | Validates generated game JSON |
| `src/ai/v2/LogicRepairer.ts` | Auto-repairs validation errors |
| `src/ai/v2/DryRunSimulator.ts` | Simulates playability without running the engine |
| `src/ai/v2/mechanics-catalog.json` | Game mechanic patterns for generators |
| `src/ai/batch/platform_constraints.json` | Must stay in sync with `contract.ts` (enforced by tests) |
| `SWIZZLE_JSON_SPEC.md` | Full spec for AI-generated game JSON |
| `supabase/migrations/` | Database schema migrations |

---

## AI Pipeline (9 steps)

Concept → Design → AssetPlan → Spec → EditorMapper → LogicValidator → LogicRepairer → AssetGenerator → DryRunSimulator → QualityScorer

---

## Environment Variables (AI generation)

| Variable | Notes |
|----------|-------|
| `ANTHROPIC_API_KEY` | Required for generation |
| `OPENAI_API_KEY` | Optional, for DALL-E image generation |
| `IMAGE_PROVIDER` | `openai` \| `claude-svg` \| `mock` |
| `SKIP_UPLOAD` | `true` = skip Supabase upload |
| `DRY_RUN` | `true` = skip LLM calls, use mock data |

---

## `src/marketing/` is an unimplemented stub

The `src/marketing/` tree (Discord / Twitter / Instagram / TikTok automation, etc.) and the `marketing:*` npm scripts are **stubs with no external API integration** — they return `success: false` or simulate failure. Treat them as a holding shelf for future work, **not** shipped functionality. Do not assume these features exist when estimating. See `src/marketing/README.md`. Deletion is deferred (pending external-API approval).

## Tests

Test files live in `__tests__/` subdirectories co-located with source. Run all with `npm run test`.

## Git

AI work goes on feature branches. Production branch is `main`.
