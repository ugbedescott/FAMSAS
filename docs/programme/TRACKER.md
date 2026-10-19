# Programme Tracker

This document is the authoritative master tracker for the BCAMS engineering programme.

## 2. Tracker

### 2.1 Completed to date

| Item | Status | Evidence or note |
| :--- | :--- | :--- |
| PRD v1.3, SRS v1.1, System Architecture v1.1, UI/UX Design v1.0 | Done | Markdown documents from earlier planning |
| Stack decisions: Electron and React Native clients, NestJS, PostgreSQL, Prisma backend | Done | Architecture document |
| Desktop frontend (Electron, React) | Built, mock-only | As-Built Report, 15 Oct 2026 |
| Desktop audit prompt and discovery prompt | Done | Reviewed and used |
| Desktop As-Built Report | Done, with gaps | Missing: offline caching, token handling, IPC validation, where matching happens, backend state |
| Review of the report: offline-first, security, device identity, audit, credentials | Done | Decisions L1 to L15 below |
| Backend implementation state | Unknown | Far from the intended system (stated by you). C0.1 produces the keep, refactor or replace verdict |
| This programme pack | Done | You are reading it |

### 2.2 Status legend

Not started · In progress · Blocked (reason recorded) · Done (acceptance passed and gate reviewed) · Waived (explicit decision recorded).

### 2.3 Chunk tracker

| ID | Chunk | Type | Depends on | Exit gate | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| C0.0 | Bootstrap programme folder | Setup | none | Folder and four files exist | Done |
| C0.1 | Backend salvage assessment and as-built discovery | Discovery | C0.0 | Keep, refactor or replace verdict per module reviewed | Done |
| C0.2 | Desktop targeted follow-up discovery | Discovery | C0.0 | Every question answered with evidence | Done |
| C0.3 | Contract reconciliation and rule extraction | Discovery | C0.1, C0.2 | Rules catalog reviewed | Done |
| C0.4 | Threat model and security requirements | Discovery | C0.1, C0.2 | SR list approved | Not started |
| C0.5 | Scanner spike | Spike | C0.0 | Measured results recorded by a human | Not started |
| C0.6 | Decision closure and plan adjustment | Review | C0.1 to C0.5 | O1 to O10 resolved, PLAN_ADJUSTMENTS approved | Not started |
| C1.0 | Backend foundation, data model and protocol drafts | Build (backend) | C0.6 | Fresh clone runs, migrates and passes tests. Protocol drafts reviewed | Not started |
| C1.1 | Identity and authentication | Build (backend) | C1.0 | Auth tests green | Not started |
| C1.2 | Authorization layer | Build (backend) | C1.1 | Negative matrix green | Not started |
| C1.3 | Audit trail | Build (backend) | C1.1 | Transactional audit tests green | Not started |
| C1.4 | Device registry and request signing | Build (backend) | C1.1, C1.2, C1.3 | Signature tests green | Not started |
| C1.5 | Domain integrity and server-authoritative rules | Build (backend) | C0.3, C1.2 | Rules catalog tests green | Not started |
| C1.5b | Domain API compliance with the desktop contract | Build (backend) | C1.2, C1.3, C1.5 | Every desktop API capability served, scoped, audited and tested | Not started |
| C1.6 | Sync ingestion and delta pull | Build (backend) | C1.4, C1.5, C1.5b | Idempotency and clock tests green | Not started |
| C1.7 | Biometric template service | Build (backend) | C1.4, C0.5 | Encryption and purge tests green | Not started |
| C1.8 | Review queue, sync health, device console APIs | Build (backend) | C1.6 | Read and acknowledge only, tests green | Not started |
| C1.9 | OpenAPI, seeds, backend end-to-end | Build (backend) | C1.0 to C1.8, C1.5b | OpenAPI v1 frozen | Not started |
| C2.1 | Electron hardening and upgrade | Build (desktop) | C0.2 | Security config tests green | Not started |
| C2.2 | Shared core package | Build (desktop) | C1.0 (protocol drafts) | Simulation harness green | Not started |
| C2.3 | Local data layer in main process | Build (desktop) | C2.1, C2.2 | Crash-durability tests green | Not started |
| C2.4 | Real client and authentication UX | Build (desktop) | C1.9, C2.1 | No mock in production bundle | Not started |
| C2.5 | Device enrollment and device modes | Build (desktop) | C2.3, C2.4 | Mode enforced in main process | Not started |
| C2.6 | Scanner integration layer | Build (desktop) | C0.5, C2.3 | Contract tests green | Not started |
| C2.7 | Local-first workflows | Build (desktop) | C2.2 to C2.6, and C1.9 for the end-to-end part | Offline workflows pass | Not started |
| C2.8 | Online admin screens and new admin UIs | Build (desktop) | C2.4 | Admin flows pass against real backend | Not started |
| C2.9 | Packaging, signing and update | Build (desktop) | C2.1 | Installer and update smoke test | Not started |
| C3.1 | Offline failure-injection suite | Verify | Phase 2 | All scenarios pass | Not started |
| C3.2 | Security verification | Verify | Phase 2 | Every SR has a control and a test | Not started |
| C3.3 | End-to-end tests with seeded backend | Verify | Phase 2 | Role flows pass in CI | Not started |
| C3.4 | Fresh as-built and readiness verdict | Verify | C3.1 to C3.3 | Verdict issued | Not started |
| C3.5 | Operations and pilot readiness | Verify | C3.4 | Restore test and runbooks done | Not started |

### 2.4 Phase gates

• Phase 0: ground truth established, O1 to O10 resolved or given defaults, PLAN_ADJUSTMENTS.md approved.
• Phase 1: backend suite green, OpenAPI v1 frozen, security tests passing, seed scripts working.
• Phase 2: no mock code in production bundles, offline workflows work locally, desktop hardened, packaged build installs and updates.
• Phase 3: the Definition of Stable (Section 8) is met.
