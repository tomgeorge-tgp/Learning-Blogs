# Tom George Learning System

Personal learning system for Tom George (CTO/SE targeting senior/staff engineering roles) — a zero-backend, zero-build, offline-capable static HTML/CSS/JS site with gamified progress tracking and spaced repetition.

**Before adding, extending, or restructuring anything in this system** (a new lesson, a new subject/category, changes to navigation, the state engine, or the gamification/spaced-repetition mechanics) — **read `SYSTEM_SPEC.md` in full first** and follow it. It is the build spec: architecture, taxonomy rules, the required lesson template, gamification/SM-2 rules, project-anchoring guidance for content, and the verification checklist to run before calling anything done.

`DESIGN.md` is the historical design record (why Phase 1 and Phase 2 were built the way they were) — read it for rationale/context, but `SYSTEM_SPEC.md` is the actionable spec to implement against.

Do not introduce a backend, a build step, a different diagramming library, a second state-storage mechanism, or a competing quiz/gamification system — extend the existing single engine (`assets/engine.js`) and single quiz widget (`assets/quiz.js`) instead.
