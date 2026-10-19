# BCAMS Backend Test, Build & Typecheck Results

**Document Version:** 1.0.0  
**Date of Snapshot:** October 19, 2026  
**Target Repository:** `bcams-be`  
**Standard:** Real terminal outputs recorded verbatim. Zero assumed or simulated passes.

---

## 1. Test Suite Inventory

| Test Tier | Configuration File | Test Files | Total Tests | Execution Target |
| :--- | :--- | :--- | :--- | :--- |
| **Unit** | `test/jest-unit.json` | 9 files | 33 tests | Pure in-memory domain logic (no DB / network) |
| **Integration**| `test/jest-integration.json` | 9 files | 21 tests | Module boundary & Prisma DB integration |
| **E2E** | `test/jest-e2e.json` | 9 files | 34 tests | HTTP API end-to-end workflows via Supertest |

---

## 2. Compilation & Build Verification

### 2.1 Static Typecheck (`npx tsc --noEmit`)
- **Command:** `npx tsc --noEmit`
- **Working Directory:** `/Users/mac/Documents/projects/bcams-be`
- **Exit Code:** `0` (PASS)
- **Output:**
```text
(Clean compilation, zero errors)
```

### 2.2 Production Build (`npm run build`)
- **Command:** `npm run build` (`nest build`)
- **Working Directory:** `/Users/mac/Documents/projects/bcams-be`
- **Exit Code:** `0` (PASS)
- **Output:**
```text
> bcams-backend@0.1.0 build
> nest build
```

---

## 3. Unit Test Execution Results (`npm run test`)

- **Command:** `npm run test` (`jest --config test/jest-unit.json`)
- **Exit Code:** `0` (PASS)
- **Execution Time:** 19.996s
- **Output:**
```text
> bcams-backend@0.1.0 test
> jest --config test/jest-unit.json

PASS test/unit/session-gate-logic.spec.ts (9.536 s)
PASS test/unit/attendance-formula.spec.ts (10.552 s)
PASS test/unit/security-signature.spec.ts (11.263 s)
PASS test/unit/clock-integrity.spec.ts (11.941 s)
PASS test/unit/policy-resolution.spec.ts (12.593 s)
PASS test/unit/biometric-logic.spec.ts
PASS test/unit/report-filtering.spec.ts (12.84 s)
PASS test/unit/roles.guard.spec.ts (12.811 s)
PASS test/unit/smoke.spec.ts

Test Suites: 9 passed, 9 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        19.996 s
Ran all test suites.
```

### Unit Tests Summary
All unit tests execute against pure in-memory functions and mocks, validating:
- Attendance percentage formula: `(attended / eligible) * 100` (FR-11.1)
- Punctuality classification: `ON_TIME` vs `LATE` (FR-14.2)
- Geofence Haversine boundary calculations (FR-10.4)
- Clock integrity monotonic divergence math (FR-4)
- Policy version resolution by date (FR-11.2)
- Biometric duplicate flagging and 2-finger minimum (FR-2.1)
- Multi-role and department scope checks in `RolesGuard` (FR-6)

---

## 4. Integration Test Execution Results (`npm run test:integration`)

- **Command:** `npm run test:integration` (`jest --config test/jest-integration.json --runInBand`)
- **Exit Code:** `1` (FAIL)
- **Execution Time:** 154.79s
- **Output:**
```text
> bcams-backend@0.1.0 test:integration
> jest --config test/jest-integration.json --runInBand

FAIL test/integration/report-security.integration-spec.ts
  ● Report Security & Cross-Department Access (Integration Test) › should explicitly REJECT HOD cross-department report access with ForbiddenException (Definition of Done)

    PrismaClientInitializationError: Unable to require(`/Users/mac/Documents/projects/bcams-be/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client/libquery_engine-darwin.dylib.node`).
    The Prisma engines do not seem to be compatible with your system. Please refer to the documentation about Prisma's system requirements: https://pris.ly/d/system-requirements

    Details: dlopen(/Users/mac/Documents/projects/bcams-be/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client/libquery_engine-darwin.dylib.node, 0x0001): tried: '/Users/mac/Documents/projects/bcams-be/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client/libquery_engine-darwin.dylib.node' (code signature in <D6D212E3-8D42-3F6F-BF71-90B88F240542> '/Users/mac/Documents/projects/bcams-be/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client/libquery_engine-darwin.dylib.node' not valid for use in process: library load disallowed by system policy)

FAIL test/integration/prisma-connection.integration-spec.ts (6.065 s)
FAIL test/integration/attendance-engine.integration-spec.ts
FAIL test/integration/audit-matrix.integration-spec.ts
FAIL test/integration/auth-audit.integration-spec.ts
FAIL test/integration/device-policy.integration-spec.ts
FAIL test/integration/identity-scoping.integration-spec.ts
FAIL test/integration/session-gate.integration-spec.ts
FAIL test/integration/sync-integrity.integration-spec.ts

Test Suites: 9 failed, 9 total
Tests:       21 failed, 21 total
Snapshots:   0 total
Time:        154.79 s
Ran all test suites.
```

---

## 5. End-to-End Test Execution Results (`npm run test:e2e`)

- **Command:** `npm run test:e2e` (`jest --config test/jest-e2e.json --runInBand`)
- **Exit Code:** `1` (FAIL)
- **Execution Time:** 127.54s
- **Output:**
```text
> bcams-backend@0.1.0 test:e2e
> jest --config test/jest-e2e.json --runInBand

FAIL test/e2e/audit-append-only.e2e-spec.ts
FAIL test/e2e/report-export.e2e-spec.ts
FAIL test/e2e/app.e2e-spec.ts
FAIL test/e2e/attendance-engine.e2e-spec.ts
FAIL test/e2e/auth-rbac.e2e-spec.ts
FAIL test/e2e/device-policy.e2e-spec.ts
FAIL test/e2e/identity-biometric.e2e-spec.ts
FAIL test/e2e/session-gate.e2e-spec.ts
FAIL test/e2e/sync-offline.e2e-spec.ts

Test Suites: 9 failed, 9 total
Tests:       34 failed, 34 total
Snapshots:   0 total
Time:        127.54 s
Ran all test suites.
```

---

## 6. Failure Root Cause Analysis (Integration & E2E)

Both integration and E2E suites failed due to a single pre-existing root cause:
- **Root Cause:** `PrismaClientInitializationError`: `library load disallowed by system policy` on macOS Darwin for dynamic library `libquery_engine-darwin.dylib.node` `[read]`.
- **System Impact:** The native Node engine binary bundled in `@prisma/client@5.22.0` has a code signature or gatekeeper incompatibility with the macOS host security policies. Furthermore, no live PostgreSQL instance was running locally (`psql` and `docker` are not installed) `[read]`.
- **Remediation Plan:** In Phase 1 (`C1.0`), provision a Docker/PostgreSQL test container and use Prisma's WASM engine (`@prisma/client` with engineType `wasm` or binary target configuration) or execute within Linux CI containers.
