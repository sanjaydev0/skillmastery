# The day card standard

Every day card in SkillMastery follows this standard. It applies to the
hand-authored Week 1 cards, to every AI-generated week, and to Help copy that
teaches a procedure.

The standard merges two sources:

- **ASD-STE100 Simplified Technical English** for the instruction layer. Short
  sentences, active voice, imperative steps, one word for one concept.
- **Low working-memory instructional design** for the learning layer. One idea,
  a five-minute start, visible progress, a check you can see. This matters for a
  13-year-old, for a tired adult, and for anyone with an attention difference.

We take the rules, not a certificate. Literal STE100 bans metaphor, which is
how design is taught. The split is deliberate: **instructions are STE-strict,
judgment keeps a point of view but must carry a concrete example.**

## Why depth survives plain language

Long sentences do not create depth. Specificity does. A card is deep when it
names the mechanism, the failure, and the observable result. That fits in short
sentences:

> A `final` variable keeps the same object. It does not freeze the object.
> `list.add('tea')` still changes a final list. Use `const` only when the whole
> value is known before the program runs.

Three sentences, 12–18 words each, and the reader now knows the difference. A
40-word sentence would add nothing.

## The fixed skeleton

A day card has five fields. The order never changes.

| Field | Job | Budget |
| --- | --- | --- |
| `title` | Name the day's one idea | ≤ 8 words |
| `summary` | What, why, mechanism, failure | 250–500 words, ≤ 5 sentences per paragraph |
| `tasks` | Do this, then check it | 2–4 items, ≤ 20 words each |
| `direction` | The detour this day prevents | ≤ 40 words |
| `designNote` | One craft lesson on this week's artefact | 25–100 words |

### 1. `title`

Name one idea. Use the learner's words, not the syllabus words.

- Good: `Why a final list still changes`
- Bad: `Immutability semantics and reference binding`

### 2. `summary`

Three to six short paragraphs, in this order:

1. **What you can do after this day.** One sentence, concrete.
2. **The mechanism.** Plain words, then one example with real values. Define a
   term the first time it appears; after that, use the same word every time.
3. **The failure this prevents.** Name the mistake, then the fix.

No forward references. "You will need this in Week 9" is noise on Day 3.

### 3. `tasks`

2–4 items. The first item must be startable in under five minutes: open a file,
run one command, write one line. The last item is the check — an output, an
error message, a pixel count, a test name. The learner must know pass or fail
without asking anyone.

- Good: `Run dart run bin/ledger.dart and count the three receipt lines.`
- Bad: `Explore null safety and reflect on what you learned.`

### 4. `direction`

The one detour this day prevents. "Do this, not that." Name the tempting wrong
move and the cost.

- Good: `Do not add ! to silence the compiler. Parse once, then check for null.`
- Bad: `Be careful with nulls.`

### 5. `designNote`

One claim about the week's artefact, then one before/after example. A metaphor
may open the note, but the example must follow in the same paragraph.

- Good: `A receipt has one primary number. Make the total 32px; make tax 13px
  and muted. If both are 24px, the eye has no anchor.`
- Bad: `Design is about hierarchy and balance.`

## The rules

1. **One idea per card.** If the day teaches two things, split it.
2. **Start with a five-minute action.** Task initiation is the hardest part.
3. **One term per concept.** Use the blueprint's `termsIntroduced` word. Never
   rotate synonyms for style.
4. **Define on first use.** One plain sentence, then use the word normally.
5. **Instructions are imperative, active, present tense.** No "you should",
   no "it will be done".
6. **Sentence caps.** 20 words for a task or direction. 25 for explanation.
7. **One action per sentence.** Do not join two steps with "and".
8. **One concrete example per abstract claim.** A number, a name, an output.
9. **Name the failure and the fix.** A warning without a fix is noise.
10. **No filler.** Banned: simply, just, obviously, of course, easy, basically,
    actually, really, very, stuff, things, etc., and so on, leverage, utilize,
    robust, seamless, powerful, modern, best practice, under the hood, magic.
11. **No idioms in instructions.** Metaphor is allowed once, in a design note.
12. **At most two choices.** One default path and, at most, one extension.
13. **Give a stop point.** "Stop after step 3. The rest is tomorrow." This is a
    scope limit, not a timer.
14. **End with a check you can see.** Output, pixels, an error, a green test.
15. **British spelling, digits for counts, a space before the unit.** `45 min`.
16. **Keep real technical names.** Do not baby-talk: no "thingy", no "magic".

## Interface consequences

The standard is not only prose. The screens that show a day card follow the same
logic:

- One accent action per screen. The next action is always the obvious one.
- The current day and its first unchecked task sit above the fold.
- Progress is a ratio, never a streak that resets to zero.
- No countdowns, no "you are behind", no red badge for a missed day.
- Pause is one click and never moves the course day backwards.
- A week always shows what is done and what is next, not a wall of options.

## Checks

`src/content/style.ts` enforces the mechanical rules:

- banned filler;
- 20-word task and direction cap, 25-word summary sentence cap;
- five-sentence paragraph cap;
- title, summary, task-count, direction and design-note budgets;
- no semicolon or em dash in a task;
- no future tense in a task.

`src/content/style.test.ts` tests the checker. The authored Week 1 test runs the
checker over every card, so a regression fails CI rather than shipping.

The rules a machine cannot judge — one idea, a real example, a useful check —
stay a review duty. The checker catches the cheap mistakes so review can spend
its attention on the expensive ones.

## Generation

Every week-generation prompt embeds `STYLE_CONTRACT` from `src/content/style.ts`
verbatim. The generator also receives the week's `termsIntroduced`, so it can
reuse the course's vocabulary instead of inventing synonyms. Generated cards
enter the app as `origin: 'ai'`, are reviewed, then become canonical.
