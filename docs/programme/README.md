# BCAMS Programme Conventions & Process Guide

## 1. Programme Authority & Master Copy
This directory (`bcams-desktop/docs/programme/`) is the **authoritative master copy** for all BCAMS programme tracking, decision records, finding registers, open questions, and chunk handoffs across the entire system.
Repositories in scope:
- `bcams-desktop` at `./bcams-desktop` (Electron, React, TypeScript)
- `bcams-be` at `./bcams-be` (NestJS, PostgreSQL, Prisma)

*Note: Mobile client development is currently out of scope.*

---

## 2. Chunk Identifiers & Workflow Lifecycle

### Chunk IDs
Every chunk follows the identifier structure:
`C<phase>.<sequence>` (e.g., `C0.0`, `C0.1`, `C0.2`, `C1.0`, `C2.1`, `C3.5`).
- Phase 0: Ground truth, discovery, spike, contracts, threat model, plan adjustments.
- Phase 1: Backend foundation, data model, security, sync, biometric services, and APIs.
- Phase 2: Desktop client hardening, local-first core, biometric scanner integration, offline workflows, and packaging.
- Phase 3: Failure injection, security verification, end-to-end testing, and operational readiness.

### Git Branching Conventions
- Branch name format: `chunk/<id>-<slug>` (e.g., `chunk/c0.0-bootstrap-programme-folder`).
- **Safety check**: Check `git status` before beginning work. Preserve any unrelated uncommitted work.
- **Commit discipline**: Exactly one commit per logical change.
- **History integrity**: No force-push (`git push --force`) and no history rewrite (`git rebase -i`, `git commit --amend` on published commits).

---

## 3. Evidence Tagging & Standards

Every claim, assertion, and finding in tracking, discovery, and handoff documentation must cite the exact file path and symbol (function, class, variable, interface, or type), and must carry one of the following tags:

- **`[read]`**: Directly inspected in active code files or configuration.
- **`[inferred]`**: Derived through logical synthesis across multiple files, configuration schemas, or runtime contracts.
- **`[unverified]`**: Hypothesized, unconfirmed, or pending active runtime validation.

### Strict Verification Segregation
Agents and developers must never claim hardware, backend, runtime, or network verification that was not physically performed in the session.
Explicitly distinguish:
1. **Static checks**: TypeScript compiler (`tsc --noEmit`), linters (`eslint`), schema validations.
2. **Mock runs**: Unit/integration tests executed against mock adapters or in-memory fixtures.
3. **Real runs**: Execution against live hardware, real database instances, or running backend daemons.

---

## 4. Status Vocabulary

When reporting the implementation state of any component, module, capability, or endpoint, use **only** the following controlled vocabulary:

- **`implemented-and-working`**: Code exists, is wired into runtime workflows, and passes verified tests.
- **`implemented-unverified`**: Code exists and appears structurally complete, but has not been verified via passing automated tests or live runtime execution.
- **`partial`**: Code exists but is missing critical paths, error handling, validation, or sub-components.
- **`mocked`**: Backed solely by simulated, static in-memory data or stubs.
- **`placeholder`**: Stub functions, empty interfaces, or UI shells without logic.
- **`disabled`**: Code is present in the codebase but deliberately commented out, gated off by feature flags, or unreachable via active routes.
- **`unreachable`**: Code exists but has no active callers, routing entries, or UI entry points.
- **`absent`**: Feature, endpoint, schema, or component is not present in the codebase.

---

## 5. Finding Severity Classification

All issues recorded in `FINDINGS.md` must be classified under the following severity definitions:

- **`Critical`**: Exploitable security flaw, or data loss or corruption in a core workflow.
- **`High`**: Core workflow broken or security weakness needing a precondition.
- **`Medium`**: Degraded behavior, workaround exists.
- **`Low`**: Cosmetic, cleanup, minor debt.

### Finding Classifications
- `bug`
- `incomplete implementation`
- `inconsistency`
- `security concern`
- `architectural limitation`
- `test gap`
- `documentation gap`

---

## 6. Handoff Format

At the conclusion of each chunk, a handoff file must be authored at `docs/programme/handoff/<chunk-id>.md` covering:
1. **Summary of Changes**: High-level narrative of what was achieved.
2. **Files Touched**: Clickable markdown links to every file created, modified, or deleted.
3. **Checks Run & Real Outputs**: Exact terminal commands and raw output for typecheck, lint, test, and build (distinguishing pre-existing issues from regressions).
4. **Deviations**: Any departure from the chunk plan, with explicit justification.
5. **New Findings**: Discovered defects, gaps, or risks added to `FINDINGS.md`.
6. **Open Questions**: Any assumptions applied or questions logged in `OPEN_QUESTIONS.md`.
7. **Prerequisites for the Next Chunk**: Clear conditions required before downstream chunks can begin.

---

## 7. Programme Rules Reference

1. **Locked Decisions**: L1 to L16 cannot be reopened. Record conflicts in `FINDINGS.md` and follow the decision.
2. **Evidence-Based Reporting**: Every claim cites file and symbol with `[read]`, `[inferred]`, or `[unverified]`.
3. **Controlled Status Vocabulary**: Use only the 8 permitted status terms.
4. **Git Safety**: Branch `chunk/<id>-<slug>`, preserve uncommitted work, one commit per logical change, no force-push.
5. **Test-First Discipline**: Write failing test first, implement fix, confirm pass. Never weaken or delete tests to force a pass.
6. **Data & Security Safety**: No destructive commands against non-local databases; migrations only through project tooling; synthetic fixtures only; zero secrets or real biometric templates in code or docs.
7. **Strict Scope & Free Tier Only**: No mobile work, no manual attendance override, zero paid dependencies (free tools, libraries, services, self-signed/free certs only).
8. **Conservative Ambiguity Resolution**: Non-blocking assumptions recorded in `OPEN_QUESTIONS.md`; stop and report if blocked or destructive.
9. **Formal Handoff**: Update `TRACKER.md`, `FINDINGS.md`, and produce `handoff/<chunk-id>.md` with real build/test outputs.
10. **Strict Exit Gates**: A chunk cannot be marked Done if any acceptance criteria are unmet; mark Partial or Blocked with explicit reasons.
