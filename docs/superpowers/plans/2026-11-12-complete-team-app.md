# Complete Team Management App Implementation Plan

> **For agentic workers:** Run sequentially in this session; the user authorized implementation.

**Goal:** Complete the React app and provide the remaining ordered Supabase SQL files without changing existing SQL files 01–03.

**Architecture:** Keep all database access in `client/src/api/`; hooks own loading/error/reload state and pages compose components. Add only ordered SQL files after 03, using table names and columns from specification §6.2 and transactional RPC writes.

**Tech Stack:** React/Vite, Supabase JS, PostgreSQL/Supabase RLS, lucide-react, dnd-kit.

**Spec:** `he-thong-quan-ly-app.md`, especially §§7.2–11.1 and 16.

## Global Constraints
- Never edit `supabase/01_ho_so.sql`, `02_cong_viec.sql`, or `03_tham_gia.sql`.
- No writes to database from the client except RPC; reads list explicit columns and honor RLS.
- Keep input text rendered as text; external links use HTTPS, `_blank`, and `noopener noreferrer`.
- Preserve the specification's open decisions in §13; do not silently invent schema.
- Provide SQL for the user to run manually, in dependency order.

## Review Focus
- RPC signatures match the JS API and the user can apply SQL in order.
- Role checks and row policies prevent cross-project/task disclosure.
- Invalid task-state changes, missing evidence, duplicate actions, and concurrent approvals fail atomically.
- Long titles, empty/error/loading states, and large lists remain usable.
- CSV export and contribution rounding preserve the specification's exact behavior.

---

### Task 1: Close API contract and schema map
- [ ] Compare every existing API, hook, and page to §§6.2–11.1; record exact RPC inputs/outputs in `HOP_DONG_API.md`.
- [ ] Keep unresolved choices explicit in §13 and implement only the stated defaults.

### Task 2: Add remaining SQL migrations
- [ ] Add ordered files after 03 for task schema/evidence/state machine, member lifecycle/transfers/votes/notifications/activity log, and reports/archive/close/reopen.
- [ ] Add explicit grants, RLS, transactional RPCs, and SQL comments for non-obvious decisions.
- [ ] Validate ordering, referenced columns, and idempotent application without modifying files 01–03.

### Task 3: Complete API and hooks
- [ ] Replace pending API modules with named methods matching the contract; add explicit-column reads and RPC-only writes.
- [ ] Ensure each requested hook exposes `{data,loading,error,reload}`.

### Task 4: Finish pages and components
- [ ] Wire task creation/assignment, checklist/evidence, approvals, handoff, cancellation/restore, membership actions, voting, notifications, report/export, archive/reopen.
- [ ] Keep role-based visibility convenience-only and preserve all five screen states.

### Task 5: Deliver and verify
- [ ] Update §15 with completed work and clearly state that SQL still requires manual execution.
- [ ] Run build and report pre-existing lint findings without broad cleanup.
- [ ] Give exact Supabase SQL Editor execution order and local app startup steps.
