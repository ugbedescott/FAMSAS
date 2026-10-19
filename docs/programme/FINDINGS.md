# Programme Findings Register

This register records all defects, security concerns, architectural limitations, inconsistencies, incomplete implementations, test gaps, and documentation gaps discovered throughout the BCAMS programme.

## Classification Taxonomy
- `bug`: Erroneous behavior or runtime failure in existing implementation.
- `incomplete implementation`: Partial feature or missing edge case/sub-path.
- `inconsistency`: Contradiction between documents, contracts, UI, or backend behavior.
- `security concern`: Flaw impacting authentication, authorization, cryptography, tamper-proofing, or privacy.
- `architectural limitation`: Structural impediment requiring redesign or bounded refactoring.
- `test gap`: Missing test suite or lack of automated regression verification.
- `documentation gap`: Missing or contradictory specifications, schemas, or guides.

## Severity Definitions
- **Critical**: Exploitable security flaw, or data loss or corruption in a core workflow.
- **High**: Core workflow broken or security weakness needing a precondition.
- **Medium**: Degraded behavior, workaround exists.
- **Low**: Cosmetic, cleanup, minor debt.

---

## Register

| ID | Chunk | Subsystem | Files and symbols | Evidence | Classification | Severity | Status | Verification | Dependencies | Suggested priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| F-001 | C0.0 | Desktop Tooling | `bcams-desktop/package.json#L11` (`lint` script) | `[read]` `npm run lint` fails because ESLint v9 is installed but no `eslint.config.js` exists. | test gap | Low | partial | Static check (`npm run lint` exit code 2) | C2.1 | Medium |
| F-002 | C0.0 | Backend Version Control | `bcams-be` root | `[read]` `bcams-be` directory is not currently initialized as a git repository (`.git` absent). | documentation gap | Low | partial | Static check (`git status` exits with code 128) | C1.0 | Medium |
| F-003 | C0.1 | Backend Authentication | `bcams-be/src/common/guards/roles.guard.ts#L43-L74` | `[read]` Authentication is absent; endpoints rely on unverified `x-user-id` header; client can escalate to `SUPER_ADMINISTRATOR` via `x-user-role-claim: SUPER_ADMINISTRATOR`. | security concern | Critical | partial | Static check | C1.1, C1.2 | Critical |
| F-004 | C0.1 | Device Management | `bcams-be/src/modules/device-policy/device-registration.controller.ts#L32-L73` | `[read]` `/devices/register` and `/devices/:deviceId/revoke` endpoints have no guards; anyone can register or revoke endpoints; symmetric pre-shared key used instead of asymmetric key pairs (violates L3). | security concern | Critical | partial | Static check | C1.4 | Critical |
| F-005 | C0.1 | Audit Trail | `bcams-be/src/modules/audit-security/audit.service.ts#L28` | `[read]` Audit logging is performed outside database transactions (`$transaction` absent) and lacks SHA-256 hash chaining (`previousHash` missing in schema, violates L6). | architectural limitation | High | partial | Static check | C1.3 | High |
| F-006 | C0.1 | Staff Gate Domain Rules | `bcams-be/src/modules/session-gate/gate.service.ts#L201` | `[read]` A third same-day staff scan logs an audit event (`STAFF_GATE_EXTRA_SCAN_IGNORED`), conflicting with Locked Decision L11 (third scan must be ignored totally: not recorded, not flagged, not stored). | inconsistency | Medium | partial | Static check | C1.5 | High |
| F-007 | C0.1 | Gate Report Authorization | `bcams-be/src/modules/reports/report.controller.ts#L37-L46` | `[read]` `ReportController` allows `Role.HOD` to query staff gate reports, conflicting with Decision O4 (only Super Admin sees gate and staff attendance reports). | inconsistency | Medium | partial | Static check | C1.5b | Medium |
| F-008 | C0.1 | Monotonic Clock Drift Threshold | `bcams-be/src/modules/sync/clock-integrity.service.ts#L5` | `[read]` Hardcoded `DIVERGENCE_THRESHOLD_MS = 60 * 1000` (60s) conflicts with Decision O5 (drift threshold 5 minutes). | inconsistency | Low | partial | Static check | C1.6 | Medium |
| F-009 | C0.1 | Sync Ingestion vs Delta Pull | `bcams-be/src/modules/sync/` | `[read]` `SyncModule` only supports batch push ingestion; delta pull for scoped biometric templates, policies, and rosters is completely absent (violates L1, L2). | incomplete implementation | High | partial | Static check | C1.6 | High |
| F-010 | C0.1 | Biometric Template Engine | `bcams-be/src/modules/identity/` | `[read]` Server-side biometric matching, template encryption at rest, and duplicate detection are absent (violates L2, L14). | incomplete implementation | High | absent | Static check | C1.7 | High |
| F-011 | C0.1 | Domain API Coverage | `bcams-be/src/` | `[read]` Over 15 endpoints required by desktop `BcamsApi` (departments, courses, offerings, student CRUD, bulk import, staff links, daily clock records) are absent. | incomplete implementation | High | absent | Static check | C1.5b | High |
| F-012 | C0.1 | Prisma Engine macOS System Policy | `bcams-be/node_modules/@prisma/client` | `[read]` Integration and e2e test execution fail with `PrismaClientInitializationError: library load disallowed by system policy` for `libquery_engine-darwin.dylib.node`. | test gap | High | partial | Mock/Real test run (`npm run test:integration` exit code 1) | C1.0 | High |
| F-013 | C0.1 | Prisma Migrations Directory | `bcams-be/prisma/migrations/20260921060000_concurrency_partial_indexes` | `[read]` Migration directory is empty (contains no `migration.sql`), indicating an aborted or corrupt migration step. | documentation gap | Low | partial | Static check | C1.0 | Low |
| F-014 | C0.1 | Web Application Hardening | `bcams-be/src/main.ts` | `[read]` Missing global `ValidationPipe`, CORS configuration, Helmet security headers, and OpenAPI documentation. | security concern | High | partial | Static check | C1.0, C1.9 | High |
