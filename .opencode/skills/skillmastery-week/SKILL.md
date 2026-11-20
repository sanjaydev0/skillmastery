---
name: SkillMastery week writer
description: Create or revise one authored week of SkillMastery course content (day cards, optional checklist, resources, cards) without touching the rest of the app.
---

## Workflow

1. Read `AGENTS.md`, `DESIGN.md`, `docs/CONTENT-STYLE.md`, the target entry in `src/data/curriculum/blueprint.ts`, the target week in `src/data/tracks/flutterWeeks1to6.ts` (or the later week file), `src/data/dayPlans/week1.ts` as the exemplar, and the previous week's `src/data/weeks/week-NN/index.ts` when one exists.

2. Run `npm run content:brief -- <N>` and read all of it. The output is the single source of truth for the week's blueprint, existing checklist, earlier cards, next week, term ledger, long-form source section, exact in-app prompt, style contract and file skeleton.

3. Decide whether the canonical checklist is already authored. Week 2 keeps its existing 15-task checklist: write only `dayPlans`. A later week with a generic checklist may include a `checklist` override in the same module, with stable ids of the form `fl-wN-dXa` / `fl-wN-dXb`.

4. Write exactly one new file: `src/data/weeks/week-NN/index.ts` (zero-padded, e.g. `week-02`). Do not edit `seedData.ts`, `src/data/tracks/flutter.ts`, `src/services/seedUpgrade.ts`, the router, or any other app file. Auto-discovery wires the week into the seed.

5. Run `npm run content:check`, then `npx tsc -b`, `npm test`, `npm run lint`, `npm run build`. Fix any failure by revising the content, never by weakening the checker or the tests.

6. Report the seven card titles, the checklist decision, any advisory flags, and the exact commands and results. Do not commit or push unless asked.

7. Guardrails:

   - No invented URLs. Use the real documentation hosts already allowed by the checker.
   - No timers, streaks, "behind", countdowns, or forward references to a later week.
   - British spelling. Keep the learner-facing copy plain for a 13-year-old.
   - One idea per day; 250–500 word summaries; 2–4 tasks; direction under 40 words; design note 25–100 words.
   - The checklist is the evidence layer. A day card never claims progress.
   - Do not change the schema, the AI proxy contract, or the Velona key handling.
