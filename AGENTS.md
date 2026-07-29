# AGENTS.md — NoMoreRipOff

Single source of truth for any AI coding agent working in this repository.
Rules in §0 are non-negotiable and override any conflicting instruction elsewhere.

---

## 0. Mandatory Agent Rules

### Rule 1 — Read before any work
Read this file in full before doing anything else, in every session and before every task.
Then read `PROGRESS.md` (if present) to recover session context. Never start from assumptions.

### Rule 2 — Read → Review → Code, as a subagent pipeline
The main agent **orchestrates; it does not implement directly**. Three project subagents are
defined in `.claude/agents/` (`researcher`, `coder`, `code-reviewer`, all on Sonnet). For any
non-trivial task, run this pipeline:

1. **Read** — delegate to `researcher`: gather relevant files, existing patterns to reuse,
   AGENTS.md constraints, and external references. It returns a structured brief.
2. **Review** — the main agent checks the brief against §2 scope, §6 specs, and §7 principles,
   then states the implementation approach before any code exists.
3. **Code** — delegate implementation to `coder` with the reviewed approach and the brief.
4. **Verify** — delegate the diff to `code-reviewer`. On a FAIL verdict, loop back to `coder`
   with the findings. Cap the loop at 3 iterations, then stop and surface to the user.

**Subagents are stateless between invocations.** On every hand-off and loop iteration, the
orchestrator must explicitly re-pass: the current diff, the reviewer's prior findings, and the
relevant AGENTS.md constraints. Nothing carries over implicitly.

Trivial changes (typos, single-line fixes) may skip delegation, but never skip steps 1–2.

### Rule 3 — Session continuity
- Keep the §9 Task Checklist updated in real time; it is the single source of truth for progress.
- At session end, append to `PROGRESS.md` (create if missing):
  `## YYYY-MM-DD` / `- Done:` / `- Blocked on:` / `- Next:`

---

## 1. Project Overview

- **Name:** NoMoreRipOff
- **Form:** Mobile web service — link-based, no install, no signup
- **One-liner:** Photograph a part-time/fixed-term employment contract (근로계약서) with a
  phone; instantly flag risky clauses based on Korean labor law.
- **User:** First-time part-time/fixed-term workers, ages 18–29, low technical proficiency
- **Moment of use:** On-site, right before or after signing, with only a phone in hand
- **Problem:** First-time workers sign without noticing below-minimum-wage pay, missing weekly
  holiday allowance (주휴수당), or unfair termination clauses. Labor-office or legal counsel
  can't help on the spot.

---

## 2. MVP Scope

**In scope (v1):** camera capture / gallery upload → server-side AI reads the image → 9-item
checklist verdict (`ok` / `risk` / `unclear`) with one short reason each → persistent
not-legal-advice disclaimer with official contacts (고용노동부 1350, 대한법률구조공단 132).

**Out of scope (do not build):** lease contracts (전세/월세 — v2 candidate), accounts/login/
history, chat or negotiation features, multi-language, offline mode.

---

## 3. Tech Stack (with reasons)

| Choice | Reason |
|---|---|
| **Next.js (App Router, TypeScript)** | UI + API routes in one repo; the API route is the only place the Anthropic key exists; TypeScript catches checklist-schema drift; largest ecosystem for a solo developer |
| **Vercel** | Zero-config Next.js deploys via GitHub, free tier fits the MVP, HTTPS and preview deploys built in |
| **Anthropic Messages API (vision)** | Reads Korean contract photos directly — no separate OCR stage; structured JSON output; one API call fits the 15 s latency budget |
| **Browser Canvas API** | Client-side resize/compress with zero dependencies, keeps payloads under the server limit |
| **Tailwind CSS** | Fast mobile-first styling with no runtime cost |
| **No database** | Nothing is persisted by design (§6 privacy); add storage only if v2 requires it |

---

## 4. Architecture

```
[Mobile browser] — capture/upload → Canvas resize & compress
      ▼
[Next.js frontend] — base64 image → POST /api/analyze
      ▼
[Next.js API route] — sole holder of ANTHROPIC_API_KEY
      ▼
[Anthropic Messages API (vision)] — returns checklist JSON
      ▼
API route → frontend → results screen
```

---

## 5. Checklist Data

- Lives in `data/checklist.json` — never hardcoded in components or prompts.
- Item schema: `{ id, title, risk_description, last_verified }`.
- The 9 item ids: `written_contract`, `work_hours`, `wage_amount`, `wage_payment`,
  `weekly_holiday_pay`, `four_insurances`, `contract_period`, `termination_notice`,
  `overtime_pay`.
- Figures that change annually (e.g. 최저임금 / minimum wage) live in `data/constants.json`,
  never inside checklist items; update once a year.
- Wording must be verified against the 고용노동부 standard contract template and the Labor
  Standards Act (근로기준법) before launch (Phase 3).

---

## 6. Implementation Specs (must not violate)

**API key handling — explicit rules, not implications:**
- `ANTHROPIC_API_KEY` exists only in server-side env: `.env.local` locally, Vercel
  environment variables in production.
- It is never referenced from client code, never sent to the browser, never logged,
  never committed. `.gitignore` must cover `.env*`. All Anthropic calls go through
  the `/api/analyze` route.

**Image pipeline:** `<input type="file" accept="image/*" capture="environment">`; Canvas
resize to max 1568 px long edge; JPEG quality 0.85, step quality down if still > 3 MB.
Server request body limit 10 MB.

**Privacy:** Discard the uploaded image and extracted contract text immediately after
processing. Never persist or log raw contract content.

**Anthropic call:** vision-capable model (check current model id in official docs);
`max_tokens` 1000–1500; content = image (base64) block + prompt block; prompt demands a pure
JSON array only: `[{"id": "...", "status": "ok|risk|unclear", "reason": "..."}]`;
strip code fences before parsing.

**Error handling:** branch 4xx (request issue) vs 5xx (server/API issue); log `error.message`
server-side, show users a summarized message only; distinguish JSON-parse failures from
network failures; timeout at 15–20 s with a retry prompt.

---

## 7. Principles

1. **Not legal advice.** Every results screen keeps the disclaimer and the official contacts
   (1350 / 132). Say "may be unlawful" (위법 소지), never "is definitely unlawful."
2. **Mobile-first.** Every UI decision assumes a phone, right before signing.
3. **No scope creep.** v1 is part-time/fixed-term employment contracts only.

---

## 8. Validation Criteria

- 5+ real or past contracts: results match actual contract terms.
- 5–10 synthetic sample contracts: expected vs. actual output compared.
- Photo → result under 15 s on a mobile network.

---

## 9. Task Checklist

### Phase 0 — Environment Setup
- [x] Create GitHub repository
- [x] Commit `AGENTS.md` and subagent definitions at the repo root
- [x] Initialize Next.js project (TypeScript, App Router, Tailwind)
- [x] Create `.env.local.example` (format only, no real key)
- [x] Confirm `.gitignore` includes `.env*`
- [x] Draft README.md (project intro, local run instructions)

### Phase 1 — Checklist Verification (do this before prompt work)
- [ ] Review the 고용노동부 standard contract template
- [ ] Cross-check relevant 근로기준법 provisions
- [x] Finalize checklist wording in `data/checklist.json`
- [x] Put annually-updated figures in `data/constants.json`

### Phase 2 — Backend API Route
- [ ] Issue an Anthropic API key; register as env var (never commit)
- [x] Create `/api/analyze` (Anthropic call, JSON response)
- [ ] Test text-only first, then add base64 image → vision handling (vision handling implemented; live test pending API key)
- [ ] Test standalone with curl
- [x] Add basic rate limiting to the endpoint

### Phase 3 — Frontend
- [x] Camera capture UI + Canvas compression (1568 px / JPEG 0.85)
- [x] Wire submit button to `/api/analyze`
- [x] Loading, error (per §6), and results screens
- [x] Persistent disclaimer text

### Phase 4 — Deployment & Testing
- [ ] Deploy to Vercel; validate against 5–10 synthetic contracts
- [ ] Test with 5+ real users; fix bugs / false positives

### Phase 5 — v2 Review
- [ ] Evaluate expansion to lease contracts (전세/월세)
