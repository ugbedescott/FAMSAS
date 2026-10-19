# BCAMS Backend Gap Analysis vs. Programme Decisions

**Document Version:** 1.0.0  
**Date of Snapshot:** October 19, 2026  
**Scope:** Locked Decisions L1–L16, Open Decisions O1–O12, and Phase 1 Chunk Areas  
**Evidence Standard:** All claims tagged `[read]`, `[inferred]`, or `[unverified]`.

---

## 1. Locked Decisions Gap Table (L1 – L16)

| ID | Decision Summary | Status | Evidence & Deficit Analysis | Closing Chunk |
| :--- | :--- | :--- | :--- | :--- |
| **L1** | **Offline-First Scope** (Capture, gate, session, lecturer auth offline; CRUD/reports online-only) | `partial` | `[read]` `SyncService.processSyncBatch` (`src/modules/sync/sync.service.ts#L24`) ingests offline capture and gate batches. However, delta pull is absent, scoped template leases are absent, and online CRUD endpoints for academic administration are missing. | `C1.6` |
| **L2** | **Hybrid Biometric Matching** (Server authority, local scoped cached matching, server duplicate check, lease expiry) | `absent` | `[read]` `IdentityService.enrollBiometrics` (`src/modules/identity/identity.service.ts#L243`) only stores opaque `templateHash`. There is no biometric SDK, no server-side 1:N / 1:1 matcher, and no template package export. | `C1.7` |
| **L3** | **Device Identities & Key Pairs** (Registered device key pair, signed events, lifecycle, bound scanner serial) | `partial` | `[read]` `DeviceAuthGuard` (`src/common/guards/device-auth.guard.ts#L61`) validates a symmetric SHA-256 pre-shared key header (`x-device-credential`). No asymmetric public key cryptography, request signature verification, or bound scanner serial exists on `Device`. | `C1.4` |
| **L4** | **Gate Terminal Mode** (No user login, kiosk mode, fixed registered location, no geofence) | `partial` | `[read]` `SessionGateController.processGateScan` (`src/modules/session-gate/session-gate.controller.ts#L62`) executes gate scan without geofence check. However, the device model lacks a dedicated role/mode field (`isGateTerminal`) and does not enforce fixed location validation. | `C1.4`, `C1.5` |
| **L5** | **Server Authoritative Rules** (Punctuality, clock, geofence, qualification server-authoritative) | `partial` | `[read]` `GateService.computePunctuality` (`src/modules/session-gate/gate.service.ts#L45`) and `AttendanceService.captureAttendance` (`src/modules/attendance/attendance.service.ts#L77`) calculate punctuality and geofence distance on server. However, student course qualification rules are missing. | `C1.5` |
| **L6** | **Server-Side Transactional Hash-Chained Audit** (Append-only, same transaction, hash-chained) | `partial` | `[read]` `AuditService.log` (`src/modules/audit-security/audit.service.ts#L28`) writes to `AuditLogEntry`. However, calls are performed outside DB transactions (no `$transaction` wrapper) and entries lack SHA-256 hash chains (`previousHash` absent in `schema.prisma#L322`). | `C1.3` |
| **L7** | **No Mock Adapter in Production Bundles** (OpenAPI client generation, seeded database) | `absent` | `[read]` Backend has no OpenAPI / Swagger configuration in `src/main.ts` or `src/app.module.ts`. No OpenAPI v1 specification is published. | `C1.9` |
| **L8** | **Invitation Activation & Step-Up Auth** (Hashed tokens, activation code fallback, Super Admin MFA) | `absent` | `[read]` Backend has no authentication controller, no invitation token schema, no MFA verification, and relies on raw `x-user-id` header bypass. | `C1.1` |
| **L9** | **Clock Protection & Reconstruction** (Monotonic clock, authenticated time anchor, per-device hash chain) | `partial` | `[read]` `CalibrationPair` (`schema.prisma#L313`) and `ClockIntegrityService` (`src/modules/sync/clock-integrity.service.ts#L21`) track monotonic elapsed time and detect reboots. However, authenticated time anchor endpoints and per-device event hash chains are absent. | `C1.6` |
| **L10** | **Class Geofence Rejection Outright** (Outright reject outside boundary with feedback) | `present` | `[read]` `AttendanceService.captureAttendance` (`src/modules/attendance/attendance.service.ts#L84-L104`) computes distance and throws `BadRequestException` when `distanceMeters > session.geofenceRadiusMeters`. | `C1.5` |
| **L11** | **Staff Gate Rules** (9am-5pm, 60m grace, 1 in, 1 out, 3rd scan ignored totally) | `partial` | `[read]` `GateService.processGateScan` (`src/modules/session-gate/gate.service.ts#L201`) creates an audit log entry on third scan (`STAFF_GATE_EXTRA_SCAN_IGNORED`), directly violating L11 ("third scan is ignored totally: not recorded, not flagged, not stored"). | `C1.5` |
| **L12** | **No Manual Attendance Correction / Override** (Out of scope, acknowledgment note only) | `present` | `[read]` No endpoints or schema exist to update or delete `AttendanceEvent` or `ClockEvent`. | `C1.8` |
| **L13** | **Mobile Reusability & Framework-Agnostic Logic** (Sync, signing, clock framework-agnostic) | `partial` | `[read]` `SecurityService` (`src/modules/audit-security/security.service.ts#L20`) uses Node native `crypto`. Core validation utilities can be extracted into framework-agnostic shared libraries. | `C1.4`, `C2.2` |
| **L14** | **Scanner Generalization & Adaptable Biometric Engine** | `absent` | `[read]` Backend does not integrate with any biometric engine or extraction port. | `C1.7` |
| **L15** | **Session Capturer Capability on Student** (No Gate Capturer role) | `partial` | `[read]` `Role` enum in `src/common/decorators/roles.decorator.ts#L7` still defines `Role.CLASS_REP` rather than a student capability. | `C1.5` |
| **L16** | **No Paid Dependencies** (Free tools, libraries, certs, free tiers verified) | `present` | `[read]` `package.json` contains only open-source libraries (NestJS, Prisma, Jest). Future email integration must use provider-neutral SMTP (O6). | `C1.0`, `C1.1` |

---

## 2. Open Decisions Alignment (O1 – O12)

| ID | Open Decision Subject | Default / Resolution | Backend Implementation Status |
| :--- | :--- | :--- | :--- |
| **O1** | Desktop offline geofence | No offline location engineering for desktop | Compliant: Backend does not enforce GPS for gate terminals. |
| **O2** | Offline lease length | 7 days default | `absent`: Backend has no lease issuance, duration tracking, or expiry flags. |
| **O3** | Probe template retention | Retained per O7 | `absent`: Probes are not ingested or stored in backend schema. |
| **O4** | HOD access to staff gate reports | Super Admin ONLY (Decided) | **CONFLICT** `[read]`: `ReportController` (`src/modules/reports/report.controller.ts#L37-L46`) grants `Role.HOD` access to staff and department gate reports. Must be restricted to Super Admin exclusively. |
| **O5** | Suspicious event qualification & drift | Counted, drift threshold 5m | **CONFLICT** `[read]`: `clock-integrity.service.ts#L5` hardcodes `DIVERGENCE_THRESHOLD_MS = 60 * 1000` (60s instead of 5 minutes). |
| **O6** | Email provider & activation codes | Provider-neutral SMTP, 12-char code | `absent`: No mail transport or activation code generator exists. |
| **O7** | Data & template purge schedule | Graduation/exit + 30 days | `absent`: No retention or automated purge job exists. |
| **O8** | Audit retention | Security events indefinite | `absent`: No audit archival or retention partitioning. |
| **O9** | Offline login method | Cached password verifier + PIN | `absent`: No password verifier hash exposed by backend. |
| **O10**| Code-signing & update hosting | Self-signed / pinned certificate | N/A (Desktop packaging concern). |
| **O11**| Biometric enrollment online-only | Must be online (Decided) | Compliant: Enrollment endpoint `/identity/persons/:personId/biometrics` requires live connection. |
| **O12**| Where server matching runs | Evaluated in C0.5 | `absent`: Matching engine not yet located or provisioned. |

---

## 3. Phase 1 Chunk Areas Gap Matrix

| Chunk ID | Area Description | Status | Evidence & Required Scope to Complete |
| :--- | :--- | :--- | :--- |
| **C1.0** | Backend foundation, data model & protocol drafts | `partial` | Code compiles with `nest build`, but Prisma dylib system policy error blocks integration/e2e suites. Protocol drafts must be authored. |
| **C1.1** | Identity and authentication | `absent` | Auth module, password hashing, JWT/refresh tokens, invitation tokens, and MFA are entirely missing. |
| **C1.2** | Authorization layer | `partial` | `RolesGuard` exists but trusts client headers (`x-user-id`, `x-user-role-claim`). Must derive claims strictly from verified JWT tokens. |
| **C1.3** | Audit trail | `partial` | Append-only database model exists, but transactional guarantees (`$transaction`) and SHA-256 hash chaining must be implemented. |
| **C1.4** | Device registry & request signing | `partial` | Status lifecycle exists, but asymmetric key pairs, request signature verification, and bound scanner serials must be implemented. |
| **C1.5** | Domain integrity & server-authoritative rules | `partial` | Geofence and punctuality logic exist; need same-lecturer session closure, student capturer capability, and total ignore on 3rd gate scan. |
| **C1.5b**| Domain API compliance with desktop contract | `absent` | Over 15 endpoints required by desktop `BcamsApi` (departments, courses, offerings, student CRUD, bulk import, staff links, daily clock records) are missing. |
| **C1.6** | Sync ingestion and delta pull | `partial` | Batch push works; delta pull, lease tracking, and per-device hash-chain verification must be built. |
| **C1.7** | Biometric template service | `absent` | Server-side template matching, AES encryption at rest, duplicate detection, and probe verification must be built. |
| **C1.8** | Review queue, sync health, device console APIs | `absent` | Acknowledgment queue for flagged events and device telemetry console endpoints must be built. |
| **C1.9** | OpenAPI, seeds, backend end-to-end | `absent` | Swagger/OpenAPI v1 generation, seed scripts, and green end-to-end test execution must be established. |
