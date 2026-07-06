# Learning System — Build Spec

This is the reusable spec for how Tom's learning system is built. Read this before adding a new lesson, subject, category, or extending the engine/navigation. It generalizes the decisions already implemented (see `DESIGN.md` for the specific rationale/history of Phase 1 and Phase 2) into rules to follow for anything new.

## 1. Non-negotiable constraints

- **Zero backend, zero build step.** Every page is a plain `.html` file linking `assets/style.css` and vanilla JS `<script>` tags. No framework, no bundler, no `npm run build`. It must keep working if opened directly from the filesystem (`file://`).
- **Offline-capable.** No CDN references. Anything external (fonts, libraries like Mermaid) is vendored into `assets/` and committed.
- **localStorage is the only system of record.** Single key (`lg_state`), versioned, defensively merged on load so new lessons/fields never corrupt existing state (see `assets/engine.js` `loadState()`).

## 2. Architecture (where things live)

- `assets/engine.js` — the single state engine (`window.LearningEngine`). Owns: XP/levels, streaks, lesson read-tracking, quiz results + SM-2 scheduling, achievements, mission generation, and the `CATEGORIES` taxonomy (`getCurriculum()`). **Any new lesson gets an entry in `LESSON_META`** (title, file, subtitle) and gets added to the right subcategory's `lessons` array in `CATEGORIES`. Do not duplicate this data elsewhere.
- `assets/quiz.js` — the reusable quiz widget (`initQuiz(containerId, data, lessonId)`). Do not fork it per-lesson; every lesson calls the same function with its own `QUIZ_DATA`.
- `assets/style.css` — the single shared stylesheet. New component styles get appended at the bottom under a clear `/* ============ SECTION ============ */` banner, matching the existing pattern. Never inline large style blocks into a lesson page except page-specific overrides (see `index.html`'s `<style>` block for the one accepted exception — dashboard-only layout tweaks).
- `assets/mermaid.min.js` — vendored diagram renderer. Reuse this file; don't add another diagramming library.
- `index.html` — the dashboard shell: sidebar (identity/XP/streak/mission/review/stats) + hash-routed drill-down content view (`#` → categories, `#cat/<id>` → subcategories, `#cat/<id>/<subId>` → lessons). New categories/subcategories are data changes in `engine.js`'s `CATEGORIES`, not new markup in `index.html`.
- `lessons/NNNN-slug.html` — one file per lesson, 4-digit zero-padded ID matching `LESSON_META`.

## 3. Navigation & taxonomy

- Curriculum is **category → subcategory → lesson**, three levels, no deeper.
- A category is `comingSoon: true` until it has real lessons; its subcategories carry a `comingSoonLessons: [labels]` array (planned topic titles, no files yet) instead of a `lessons: [ids]` array.
- When a coming-soon subcategory gets its first real lesson, move its topics from `comingSoonLessons` into `lessons` (or leave remaining ones in `comingSoonLessons` if only some are built) and write the actual lesson file.
- Category/subcategory ids are kebab-case, stable once created (they're in the URL hash).

## 4. Gamification & spaced repetition

Reuse the existing mechanics for any new content — don't invent a parallel system:
- **XP:** +50 for first-time "mark as read", +10 per correct quiz answer (repeatable — reviews should keep earning XP).
- **Levels:** shared threshold curve in `engine.js` (`XP_THRESHOLDS`). Don't add a per-subject level track.
- **Streak:** one shared streak across the whole system, not per-category.
- **SM-2 spaced repetition:** every quiz completion schedules the next review via the existing `recordQuizResult()`. Never bypass this for a "new" quiz type — if a lesson needs retrieval practice, it's a quiz that calls `initQuiz(...)`.
- **Achievements:** add new ones to `ACHIEVEMENTS` in `engine.js` sparingly, only for genuinely new milestones (e.g. "second category completed") — don't spam achievements per lesson.

## 5. Lesson page template

Every lesson follows this section order (see `lessons/0001-cap-theorem.html` as the canonical reference file — read it in full before writing a new lesson):

1. Breadcrumb (`← Curriculum`), mark-read bar, lesson progress bar/label.
2. Header: `lesson-meta` (`Category › Subcategory · Lesson NN`), `pillar-badge` (= subcategory label), title, subtitle, Focus Mode button.
3. **Core definition** — the precise, textbook-correct statement of the concept, usually a table.
4. **A Mermaid diagram** (`.diagram-frame` / `.diagram-frame-label` / `<pre class="mermaid">`) visualizing the lesson's actual mechanism — not decorative. Placed right after the core definition, before the plain-English section. Every lesson gets at least one.
5. **Plain English / real scenario** — a concrete walkthrough grounded in one of Tom's actual projects (see §6).
6. **Your stack, mapped** — a table connecting the abstract concept to concrete systems/tools he actually uses.
7. One or more **cross-project callout(s)** (`.callout` with `<span class="callout-label">Cross-project check — <Project></span>`) extending the mechanism to a *different* project than the main walkthrough used, so lessons don't all lean on the same one project.
8. Deeper/extension material as the topic warrants (e.g. PACELC for CAP, EXPLAIN ANALYZE for indexing) — substantive, not padding.
9. **Interview Playbook** — 3 accordion Q&As: model answer + a probing follow-up answer. This is deliberate-practice material, not a summary.
10. **Retrieval Practice quiz** — 5 questions via `initQuiz('quiz', QUIZ_DATA, LESSON_ID)`.
11. Primary sources (1–2 real external references, with a one-line note on why it's worth reading).
12. Prev/Next navigation (sequential across the whole curriculum, not just within-subcategory) + "Ask your teacher anything" card + footer.
13. Scripts at the bottom, in this order: playbook accordion JS → Mermaid include + `mermaid.initialize(...)` → `engine.js` + `quiz.js` + `QUIZ_DATA` + `initQuiz(...)` → mark-read/focus-mode/Pomodoro JS.

## 6. Content voice & project-anchoring

- Tone: dense, technically precise, interview-calibrated. No conceptual throat-clearing, no padding for length. Every addition should teach something a strong candidate would need, not restate the obvious.
- Ground explanations in Tom's real stack and projects — rotate across all of them rather than defaulting to the same one every time:
  - **applyGOAT** — AI career platform, multi-tenant SaaS, PostgreSQL + Pinecone, Docker/Caddy. Default anchor for core data/scaling/schema topics.
  - **AI Sales Agent** — LangGraph + RAG, insurance domain. Default anchor for anything RAG/agent/retrieval-shaped.
  - **eBider** — agri auction platform. Good for concurrency/locking/race-condition scenarios (competing bids on one row).
  - **Mini Hermes Agent** — self-evolving agent, persistent memory, MCP. Good for NoSQL/memory-layer topics.
  - **SyncPoint** — AI workflow intelligence. Use where it's a more natural fit than the above.
  - **KeyShield** — LLM API key governance concept. Niche; use only if a lesson is specifically about API/access control.
  - Don't force a project reference where none fits naturally — a lesson can lean on just one or two projects if that's the honest mapping.

## 7. Verification (do this before calling any addition done)

Reuse the harness already proven in this project: `python -m http.server` serving the project root + a headless-Chromium Playwright script (Node, `npx playwright`). For any change:
1. Category/subcategory/lesson drill-down still resolves and the new lesson appears in the right place.
2. The lesson's Mermaid diagram(s) render to `<svg>` (not raw text).
3. Regression: mark-as-read still awards XP once, quiz still records score + XP + next-review date, focus mode still toggles.
4. `console --errors` (or the Playwright `pageerror`/`console` listeners) clean — zero errors.
5. If it's a new category/subcategory, confirm coming-soon states render correctly and that promoting one topic to a real lesson doesn't break the others still marked coming-soon.
