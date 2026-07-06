# Learning System Redesign — Design Document

**Project:** Tom George Learning System (E:\Learning)
**Author:** Product Design / Learning Science / Engineering review session
**Date:** 2026-07-04
**Status:** Phase 1 implemented (see §14); Phase 2 implemented (see §15)

---

## 1. Executive Summary

The learning system is a static HTML/CSS/JS site with genuinely excellent content: ten dense, technically precise database lessons, each anchored to Tom's real projects (applyGOAT, the AI Sales Agent), with interview playbooks and retrieval-practice quizzes. The content layer is the hard part of a learning product and it is already done well.

What the system lacks is everything *around* the content: memory, feedback, and motivation. Nothing persists. Quiz scores evaporate on page close. The homepage claims "10 lessons complete" as hardcoded HTML regardless of whether anything was read. There is no spaced repetition, so the quizzes — the single most valuable learning activity in the system — are taken exactly once, at the moment when they matter least (immediately after reading, when recall is trivially easy). There is no streak, no daily goal, no reason to come back tomorrow.

This document proposes and specifies a redesign built on three principles:

1. **The system must remember.** All learner state (reads, quiz results, XP, streaks, review schedules) persists in `localStorage` — no backend required, in keeping with the zero-infrastructure ethos of the current site.
2. **The system must schedule.** An SM-2 spaced repetition engine turns each quiz from a one-shot check into a recurring review cycle, which is where actual retention comes from.
3. **The system must motivate.** A lightweight gamification layer (XP, levels, streaks, achievements, a daily mission) gives each session a visible payoff and each day a reason to return.

Phase 1 — implemented in this session — delivers the core state engine, spaced repetition scheduling, a live dashboard homepage, lesson completion tracking, fixed navigation, focus mode with a Pomodoro timer, and persistent quiz results across all ten lessons. Everything is pure HTML/CSS/JS.

---

## 2. Current System Analysis

### 2.1 Architecture

```
E:\Learning\
├── index.html                  # curriculum homepage (static)
├── assets\
│   ├── style.css               # shared stylesheet
│   └── quiz.js                 # reusable quiz widget
├── lessons\
│   ├── 0001-cap-theorem.html   … 0010-vector-databases.html
├── MISSION.md, NOTES.md, RESOURCES.md
└── learning-records\
```

- **No backend, no database, no build step.** Every page is a self-contained HTML file linking one shared stylesheet and one shared script.
- **Lesson anatomy** (consistent across all 10): header with meta/badge/title/subtitle → dense content with tables, code blocks, callouts → Interview Playbook accordion (Q + model answer + follow-up answer) → 5-question multiple-choice quiz via `initQuiz()` → primary sources → "ask teacher" card → footer.

### 2.2 Strengths

- **Content quality.** Technically precise, interview-calibrated, and consistently anchored to Tom's actual stack and projects. The applyGOAT framing ("your Pinecone index is AP; your subscription table must be linearisable") is exactly the kind of encoding-specific elaboration that learning science says produces durable memory.
- **The Interview Playbook pattern.** Question → model answer → follow-up answer mirrors the real interview loop and doubles as free-recall prompts.
- **Quiz feedback.** Immediate correctness feedback with explanations — correct implementation of the testing effect's feedback requirement.
- **Design.** Clean, typographic, serif-body/sans-UI split, dark code blocks, restrained color. Reads like a well-edited technical publication.
- **Zero infrastructure.** Opens from the filesystem, works offline, nothing to deploy or maintain.

### 2.3 Weaknesses (the problems this redesign fixes)

1. **No progress tracking** — "10 lessons complete" is hardcoded; the system has no idea what has been read.
2. **No spaced repetition** — quizzes are one-shot; nothing schedules re-testing at the moment of near-forgetting.
3. **No gamification** — no XP, streaks, or achievements; sessions have no visible payoff.
4. **Quiz results not persisted** — close the tab, lose everything.
5. **Broken navigation** — Lesson 01 said "Next: coming soon" although Lesson 02 exists; 02 → 03 likewise; 03 had no Next; 04 had no Previous.
6. **No daily routine** — no streak, no daily goal, no "today's mission."
7. **No focus mode** — no way to strip chrome and time a deep-work block.
8. **Static stats** — dashboard numbers are decorative fiction.
9. **No lesson completion tracking** — no distinction between visited and finished.
10. **No review queue** — nothing surfaces "what should I revisit today?"

---

## 3. UX Audit (Page by Page)

### 3.1 Homepage (`index.html`)

- **Fake stats erode trust.** "10 lessons complete" being hardcoded means the most prominent number on the page is a lie. Once a learner notices, every other signal loses credibility.
- **No state differentiation on lesson cards.** All ten cards look identical whether read five times or never opened. The learner must remember their own position in the curriculum — exactly the memory burden a dashboard should remove.
- **No "what should I do right now?"** The page is a table of contents, not a launchpad. Every visit begins with a decision ("which one was I on?") — decision friction is the top killer of short daily sessions.
- **Coming-soon stubs are good** — they show the roadmap and create an open loop (Zeigarnik effect), and cost nothing.

### 3.2 Lesson pages (all 10)

- **No completion affordance.** A lesson can only be *left*, never *finished*. Closure matters: an explicit "mark as read" gives a session a defined end and a reward moment.
- **No position indicator.** Inside a lesson there is no cue of where it sits in the 10-lesson arc.
- **Navigation defects** (detailed in §2.3, item 5) actively block the natural read-next flow — the cheapest engagement loop the site has.
- **Quiz score screen is a dead end.** It shows a percentage and a retry button. No XP, no "when will I see this again," no consequence. The single richest moment for reinforcement is wasted.
- **The "ask teacher" card is a strong close** — keep it, but hide it in focus mode.

### 3.3 Quiz widget (`quiz.js`)

- Solid interaction design: one question at a time, locked options after answering, explanation on every answer.
- **Retry regenerated the widget via inline `onclick` with JSON injected into an HTML attribute** — fragile against quotes in quiz data. Replaced with a closure-based listener in Phase 1.
- **Results discarded** — the core defect; fixed by wiring into the engine.

---

## 4. Learning Science Review

### 4.1 Active recall — partially present, under-leveraged

The quizzes are genuine retrieval practice ("Answer from memory. No scrolling up." is exactly the right instruction). But recall practice only occurs once per lesson, immediately after reading — when retrieval strength is at its lifetime maximum and the retrieval attempt therefore produces minimal strengthening. The testing effect's payoff comes from *effortful* retrieval, i.e., retrieval when you have partially forgotten.

### 4.2 Spaced repetition — absent (the biggest gap)

Ebbinghaus forgetting curves imply that without re-exposure, most of a lesson's recallable detail is gone within days. The fix is not re-reading (passive review is near-worthless per Karpicke & Roediger) but *scheduled re-testing* at expanding intervals. The system already owns the perfect review instrument — the quizzes — it just never re-administers them. Phase 1 adds an SM-2 scheduler: every quiz completion computes the next review date; the dashboard surfaces due lessons as a Review Queue and makes the oldest due review "Today's Mission."

### 4.3 Deliberate practice — present in content, absent in structure

The Interview Playbook is deliberate-practice material (realistic task, model comparison), but the system never prompts the learner to *attempt an answer before revealing it*, and never cycles back to weak areas. Future phases: hide-then-reveal self-grading on playbook items, and per-topic weakness tracking feeding the mission generator.

### 4.4 Other principles

- **Elaborative encoding:** excellent (project anchoring) — preserve at all costs.
- **Interleaving:** absent; the review queue naturally introduces it since due reviews mix topics.
- **Metacognition:** no calibration signal ("do I actually know this?"). Persistent quiz-best scores per lesson are the Phase 1 down payment; confidence ratings are a Phase 3 candidate.
- **Goal gradients:** no progress bars anywhere. Phase 1 adds XP progress, lesson-position bars, and per-lesson completion state.

---

## 5. Engagement Analysis (Why Motivation Drops)

Mapping the current system against the Hook model / self-determination theory:

- **Trigger:** none. Nothing invites a return visit. No streak to protect, no due reviews, no daily mission. Each session begins from cold motivation, which is exactly the resource a busy CTO has least of.
- **Action:** friction at session start (choose a lesson from an undifferentiated list) and no minimum viable action ("just clear one review" is a 3-minute commitment; "read a lesson" is a 45-minute one — the system only offers the latter).
- **Variable reward:** zero. Outcomes are fully predictable and unrecorded. Achievements and XP with occasional unlocks add cheap variability.
- **Investment:** nothing accrues. No state means no sunk value, no streak, no level — nothing the learner would regret abandoning. LocalStorage state converts every session into visible accumulated investment.
- **Competence signaling (SDT):** the system never says "you are getting better." Levels, best scores, and a growing completed-lesson count are direct competence feedback.
- **Autonomy:** already good — self-paced, no lockouts. The gamification layer deliberately avoids punitive mechanics (no streak-shaming copy, no decaying XP) to preserve this.

Predicted failure mode of the status quo: strong start (novelty + high-quality content), then decay to zero visits within 2–3 weeks once novelty fades, because nothing pulls the learner back on day N+1. The redesign's job is to make day N+1 the *easiest* day: open dashboard → see mission → one click → 5–30 minutes → visible XP/streak payoff.

---

## 6. Proposed New Learning System (Redesign Vision)

The redesign keeps the publication-quality content layer untouched and wraps it in a **stateful learning shell**:

1. **A live dashboard** (new `index.html`): dark sidebar with identity (avatar, level, XP bar), streak, Today's Mission card, Review Queue card, and real stats; main panel with the curriculum, where lesson cards reflect true state (completed ✓, review due badge).
2. **A daily loop:** Mission → do the thing → XP/achievement payoff → streak extends → tomorrow's reviews scheduled. The mission generator prioritizes due reviews over new content — retention before acquisition.
3. **A per-lesson loop:** progress indicator → optional focus mode (Pomodoro) → read → mark as read (+50 XP) → quiz (+10 XP per correct) → SM-2 schedules the return visit.
4. **A long arc:** levels (thresholds spanning ~a year of consistent use), achievements marking meaningful milestones, and eventually per-pillar mastery views.

Everything remains file-openable, offline-capable, framework-free. The engine is one ~350-line vanilla JS file; the schema is one localStorage key.

---

## 7. Gamification System Design

### 7.1 XP economy

| Action | XP | Rationale |
|---|---|---|
| Mark lesson read (first time only) | +50 | Rewards completing the heavy activity; not repeatable (no farming) |
| Quiz correct answer | +10 (max +50/attempt) | Rewards performance, not just attendance; retakes/reviews keep earning, which is intentional — reviews are the behavior we most want to pay for |

### 7.2 Levels

Thresholds: `0, 200, 500, 1000, 2000, 4000, 7000, 11000, 16000, 22000, 30000` → Levels 1–11. Early levels are fast (Level 2 ≈ 3 lessons + quizzes) for immediate momentum; later gaps widen so levels stay meaningful as the curriculum grows to Pillars 2–3. The sidebar XP bar shows progress within the current level (goal-gradient effect).

### 7.3 Streaks

A day counts if the learner marks a lesson read **or** completes a quiz. Rules: same day = no change; consecutive day = +1; gap = reset to 1. Displayed prominently (🔥 n day streak) in the sidebar. Deliberately no freezes/repair items in Phase 1 — keep the mechanic honest and simple.

### 7.4 Achievements

| id | Label | Condition |
|---|---|---|
| `first_lesson` | First Step | Any lesson read |
| `quiz_perfect` | Perfect Score | 100% on any quiz |
| `three_day_streak` | On a Roll | Streak ≥ 3 |
| `seven_day_streak` | Committed | Streak ≥ 7 |
| `five_lessons` | Momentum | 5+ lessons read |
| `all_database` | Database Master | All 10 lessons read |
| `first_review` | Spaced Out | Second quiz attempt on any lesson (first SR review) |

Unlocks are checked after every state-mutating action; new unlocks surface inline (mark-read bar, quiz score screen) and the full grid (earned vs. locked-greyscale) lives on the dashboard — locked achievements are visible on purpose, as goals.

### 7.5 Today's Mission

Priority order: (1) oldest due review, (2) next unread lesson, (3) "all caught up." One mission, not a list — a single unambiguous next action with an XP reward attached. The card is clickable and deep-links to the lesson.

---

## 8. Spaced Repetition Engine Design

SM-2 (SuperMemo-2), adapted for quiz-percentage input, entirely client-side.

**Per-lesson SR state:** `srNextReview` (ISO date), `srInterval` (days, init 1), `srEaseFactor` (init 2.5).

**On every quiz completion** (`recordQuizResult(lessonId, score, total)`):

```
pct = score/total × 100
q   = pct ≥ 90 → 5 | pct ≥ 75 → 4 | pct ≥ 60 → 3 | pct ≥ 40 → 2 | else 1

if q < 3:                     # failed recall
    interval = 1              # see it again tomorrow; ease unchanged
else:
    ease     = max(1.3, ease + 0.1 − (5−q)·(0.08 + (5−q)·0.02))
    interval = round(prevInterval × ease)

srNextReview = today + interval days
```

Behavior: a run of 90%+ scores produces roughly 1 → 3 → 7 → 18 → 47-day intervals (ease climbing past 2.6) — classic expanding schedule. A weak score collapses the interval to 1 day without destroying accumulated ease; a mediocre pass (60–74%) grows slowly because ease is penalized toward its 1.3 floor.

**Due computation:** `getDueForReview()` returns lessons with `srNextReview ≤ today` (string comparison on ISO dates is safe). Surfaced in three places: Review Queue sidebar card, "Review" badges on lesson cards, and Today's Mission.

Granularity note: scheduling is per-lesson (one deck of 5 questions), not per-card. This is coarser than Anki but proportionate — 10 lessons × 5 questions. Per-question scheduling is a Phase 3 refinement if question counts grow.

---

## 9. Focus Mode Design

**Problem:** lesson pages carry navigation chrome and end-of-page cards that invite exit; deep reading benefits from a stripped, timed container.

**Design:**
- Toggle via a `⊙ Focus Mode` button in the lesson header or the `F` key (ignored while an input/button is focused).
- Entering focus mode adds `focus-mode-active` to `<body>`: breadcrumb nav and "ask teacher" card are hidden; a fixed Pomodoro timer appears bottom-right.
- **Pomodoro:** 25:00 work countdown → auto-switches to a 5:00 break (☕) → cycles. Clicking the timer exits focus mode. Exiting stops the timer.
- No persistence of pomodoro counts in Phase 1 (candidate for `totalTimeMinutes` accrual in Phase 2).

The mechanic is deliberately gentle: no forced fullscreen, no blocking — it removes temptation rather than policing.

---

## 10. Progress Intelligence Design

What the system now knows, and where it shows it:

| Signal | Source | Surface |
|---|---|---|
| Lessons read (n/10) | `lessons[id].read` | Sidebar stat, completed card styling |
| Quiz mastery | `quizBest`/`quizTotal` per lesson | Quiz score screen; (Phase 2: on lesson cards) |
| Retention schedule | `srNextReview` per lesson | Review Queue, card badges, mission |
| Consistency | `streak` | Sidebar streak badge + stat |
| Overall investment | `xp`, `level` | Level badge, XP bar, stat |
| Milestones | `achievements[]` | Dashboard grid, inline unlock toasts |

Phase 2+ intelligence: per-lesson attempt history (score trajectory), weakness detection (lessons whose best score stays < 80% after 2+ attempts get flagged and mission-prioritized), and a simple "retention health" indicator (fraction of lessons with a future review scheduled).

---

## 11. Feature Specifications

### F1 — Core State Engine (`assets/engine.js`)
Exposes `window.LearningEngine`. See §12 for schema and the task list below for the full API: `getState`, `markLessonRead`, `recordQuizResult`, `getStreak`, `getLevelInfo`, `getDueForReview`, `checkAndUnlockAchievements`, `getAchievementDefs`, `getTodaysMission`, `getLessonMeta`. All mutating functions save synchronously and return `{ xpGained, newAchievements, … }` payloads for immediate UI feedback. Defensive: state is merged over defaults on load (forward-compatible when lessons are added); localStorage failures degrade to in-memory state.

### F2 — Persistent quizzes (`assets/quiz.js`)
`initQuiz(containerId, data, lessonId)` — third arg optional; when present and the engine is loaded, quiz completion records the result, awards XP, schedules review, and the score screen shows: tiered message (100% "Perfect! 🎯" / ≥70% "Solid work 💪" / else "Keep going 🔄"), `+n XP earned`, `Next review in n days`, and any achievement unlocks. Retry re-runs the same quiz (and legitimately records a new attempt — that *is* a review).

### F3 — Dashboard homepage (`index.html`)
Two-panel layout: dark sidebar (identity, level badge, XP bar with to-next label, streak, Today's Mission card [clickable deep-link], conditional Review Queue card, 3 stats) + main panel (curriculum pillars, achievements grid, coming-soon stubs for Pillars 2–3). All numbers computed from engine state at load; lesson cards get `completed` styling and `Review` badges from real state.

### F4 — Lesson instrumentation (all 10 lesson files)
Each lesson gains: progress label + bar ("Lesson N of 10", width N×10%); mark-read bar (top, converts to "✓ Lesson complete" state when already read); focus mode button + `F` shortcut; Pomodoro widget; engine script include; lesson-ID-wired quiz; corrected prev/next navigation (01→02, 02→03, 03 gains Next→04, 04 gains Previous→03; 05–10 were already correct).

### F5 — Focus mode + Pomodoro
As specified in §9. Pure CSS class toggle + ~40 lines of JS per lesson page.

---

## 12. State Design (localStorage Schema)

Single key: **`lg_state`**. No backend exists; localStorage is the system of record.

```json
{
  "version": 1,
  "xp": 0,
  "level": 1,
  "streak": { "count": 0, "lastDate": null },
  "lessons": {
    "0001": {
      "read": false, "readAt": null,
      "quizBest": null, "quizTotal": null, "quizAttempts": 0,
      "srNextReview": null, "srInterval": 1, "srEaseFactor": 2.5
    }
    // … "0002" … "0010"
  },
  "achievements": ["first_lesson"],
  "totalTimeMinutes": 0
}
```

Design decisions:
- **Dates as ISO `YYYY-MM-DD` strings** (UTC) — human-readable in DevTools, safely comparable with `<=`.
- **`quizTotal` stored alongside `quizBest`** so "perfect score" is evaluable without re-deriving quiz length.
- **`level` is denormalized** (recomputed from `xp` on every save) — cheap and convenient for inspection.
- **Version field + defensive merge:** unknown/missing fields are filled from defaults on load, so adding lessons 0011+ or new fields never corrupts existing state. A future breaking change bumps `version` and runs a migration in `loadState`.
- **Failure modes:** corrupt JSON → fresh default state; localStorage unavailable (some `file://` privacy configurations) → engine runs in-memory and the site degrades to its previous static behavior without errors.
- **Known limitation:** state is per-browser-profile and per-origin. Acceptable for a single-user local system; export/import JSON is the Phase 2 mitigation.

---

## 13. Implementation Roadmap

**Phase 1 — Core loop (this session).** Engine, persistent quizzes, SM-2 scheduling, dashboard, lesson instrumentation, fixed navigation, focus mode. *Success metric: every visit reflects true state; a daily mission always exists.*

**Phase 2 — Retention & resilience (next session).** State export/import (JSON download/paste); time tracking wired to Pomodoro (`totalTimeMinutes`); per-lesson quiz history and score trajectory; review-all flow (chain due quizzes back-to-back); achievement toast animation; mission variety (e.g., "answer one playbook question aloud").

**Phase 3 — Deliberate practice depth.** Hide-then-reveal self-graded playbook answers feeding SR at the question level; weakness detection and mission prioritization; confidence ratings for calibration; per-question SM-2 scheduling.

**Phase 4 — Curriculum scale.** Pillars 2–3 content (the engine already tolerates new lesson IDs); per-pillar mastery views; long-arc achievements (30-day streak, Level 5, all-pillars).

Deliberately out of scope while the system serves one user: backend/auth/sync, frameworks and build tooling, social features.

---

## 14. What Gets Built in Phase 1 (This Session) — Implemented

| # | Deliverable | File(s) | Status |
|---|---|---|---|
| A | Core state engine: schema, XP/levels, streaks, SM-2, achievements, mission generator | `assets/engine.js` (new) | ✅ |
| B | Quiz persistence + XP/review/achievement feedback on score screen; safer retry | `assets/quiz.js` | ✅ |
| C | Component styles: sidebar/dashboard, XP bar, streak, mission/review cards, completed cards, review badges, mark-read bar, achievements grid, progress bar, focus mode, Pomodoro | `assets/style.css` (appended) | ✅ |
| D | Dashboard homepage with live sidebar, real stats, state-aware lesson cards, achievements grid | `index.html` (rewritten) | ✅ |
| E | All 10 lessons instrumented: engine include, lesson-ID quizzes, mark-read bar, progress indicator, focus mode + Pomodoro, fixed prev/next navigation | `lessons/0001…0010` | ✅ |

Manual test checklist:
1. Open `index.html` → sidebar shows Level 1, 0 XP, 0 streak; mission = "Read: CAP Theorem…".
2. Open Lesson 01 → progress bar "Lesson 1 of 10"; click **Mark as read** → `+50 XP · Lesson complete ✓ 🏆 First Step`.
3. Take the quiz → score screen shows XP earned and "Next review in n days".
4. Return to `index.html` → card 01 is green with ✓; stats show 1 lesson; XP bar has moved; First Step is lit in the achievements grid.
5. Press `F` in a lesson → chrome hides, Pomodoro appears and counts down; `F` again restores.
6. In DevTools, set `lessons["0001"].srNextReview` to yesterday → dashboard shows Review Queue card, "Review" badge on card 01, and the mission becomes the review.

---

## 15. Phase 2 — Category Navigation, Mermaid Diagrams, Lesson Depth (Implemented)

Phase 2 responded to a direct request to make the system easier to learn from: a real category structure instead of a flat page, visual flowcharts instead of prose-only mechanism explanations, and deeper per-lesson content anchored to more of Tom's projects than just applyGOAT.

### 15.1 New taxonomy

Replaced the "Pillar 1/2/3" framing with 4 categories, each with subcategories:

- **Data & Storage Systems** (active) — Distributed Systems Foundations, Query Layer (SQL), Storage Engine Internals, Scaling & Architecture, Schema Design, Beyond Relational. The existing 10 lessons were regrouped into these finer subcategories (previously one flat "Database" group of 9 + one "Distributed Systems" group of 1).
- **System Design** (coming soon) — Core Patterns, Design Problems.
- **Engineering Execution** (coming soon) — Infrastructure & Reliability.
- **AI & LLM Engineering** (coming soon, new) — RAG Pipelines, Agent Architectures, LLM Ops. Added because it's Tom's actual specialty (LangGraph, RAG, Pinecone across applyGOAT and AI Sales Agent) and gives the roadmap visible forward motion in his strongest area.

The taxonomy is a single `CATEGORIES` structure in `assets/engine.js`, exposed via `LearningEngine.getCurriculum()`, which joins category/subcategory grouping with live lesson state (title, subtitle, file, read, reviewDue) from `LESSON_META` and `state.lessons`. `LESSON_META` gained a `subtitle` field so `index.html` no longer needs to duplicate lesson descriptions.

### 15.2 Drill-down navigation

`index.html`'s main-content panel is now a hash-routed, data-driven 3-level view (sidebar untouched):

- `#` → category grid (icon, description, "n/m lessons" or "Coming soon"), achievements grid below it.
- `#cat/<id>` → subcategory grid with breadcrumb `Curriculum / <Category>`.
- `#cat/<id>/<subId>` → lesson list (same `.lesson-card` markup/behavior as before — completed styling, review badges) with breadcrumb `Curriculum / <Category> / <Subcategory>`.

A single `renderView()` reads `location.hash` and re-renders `#content-view` on every `hashchange` — free browser back/forward support, no router library. Today's Mission / Review Queue sidebar cards still deep-link straight to the lesson file, bypassing the category tree.

### 15.3 Mermaid.js diagrams

`assets/mermaid.min.js` is vendored (via `npm pack mermaid`, dist UMD bundle copied in — no CDN dependency, stays file-openable/offline). Each lesson that has a diagram includes it and calls `mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' })`. Diagrams render inside `<pre class="mermaid">` wrapped in a `.diagram-frame` container styled to match the site's callout/card system.

One caught issue: the site's global `pre { background: var(--code-bg); ... }` rule (for code blocks) was bleeding a dark code-editor background onto the mermaid SVGs. Fixed with a `pre.mermaid { background: transparent; ... }` override in `assets/style.css`.

Every lesson (0001–0010) now has at least one diagram visualizing its actual mechanism (not decorative) — e.g. the CAP decision flowchart, B-tree lookup path + seq-scan-vs-index-scan comparison, replica/shard topology, SQL logical execution order, the query planner pipeline, the N+1-vs-batched rewrite, the 1NF→BCNF ladder, an MVCC `sequenceDiagram` + WAL write path, a NoSQL access-pattern decision tree, and the ANN/HNSW search flow.

### 15.4 Content depth pass

Each lesson also gained a `.callout` titled "Cross-project check — `<Project>`" tying its core mechanism to a project beyond applyGOAT where the mapping is genuine: AI Sales Agent (LangGraph/RAG N+1 and rerank scenarios), eBider (concurrent-bidding MVCC/locking), Mini Hermes Agent (persistent memory NoSQL access patterns) — applyGOAT remains the anchor for lessons where it's the strongest fit (indexing, scaling, normalization, SQL fundamentals, query execution). Each lesson also got one concrete mechanism-level addition (e.g. an `EXPLAIN ANALYZE` before/after on lesson 02, a real N+1 code shape on lesson 06) rather than padding. Lesson headers (`lesson-meta` / `pillar-badge`) were updated to reflect the new category/subcategory names. Sequential Next/Previous navigation (0001→0010) was left unchanged.

Verified end-to-end with a headless-Chromium harness (`python -m http.server` + Playwright): category→subcategory→lesson drill-down and back-button behavior, a Mermaid `<svg>` rendering on all 10 lessons, and the full Phase 1 regression set (mark-as-read, quiz XP/SR feedback, focus mode) — all clean, zero console errors.
