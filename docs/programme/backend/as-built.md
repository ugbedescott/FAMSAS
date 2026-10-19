# BCAMS Backend As-Built Assessment

**Document Version:** 1.0.0 (As-Built Discovery Baseline)  
**Date of Snapshot:** October 19, 2026  
**Target Repository:** `./bcams-be` (`bcams-backend` v0.1.0)  
**Evaluation Nature:** Read-Only Technical Inventory, Runtime Audit & Salvage Assessment  
**Evidence Standard:** All claims tagged `[read]`, `[inferred]`, or `[unverified]`.

---

## 1. Executive Summary

A comprehensive read-only technical assessment was performed on the NestJS backend repository at `./bcams-be`. The backend was developed as a Greenfield API prototype against early SRS v1.1 and Architecture v1.1 drafts. 

### Key Findings
1. **Compilation & Unit Tests:** The TypeScript codebase is syntactically sound; static compilation (`tsc --noEmit`) and NestJS build (`nest build`) complete with exit code 0 `[read]`. In-memory unit test suites pass completely (9/9 suites, 33/33 tests green) `[read]`.
2. **Critical Security & Auth Deficit:** The backend has **no real authentication module** `[read]`. Endpoints rely on an untrusted HTTP header `x-user-id` to identify callers `[read]`. Worse, `RolesGuard` permits client privilege escalation via `x-user-role-claim: SUPER_ADMINISTRATOR` `[read]`.
3. **Device Authentication Flaw:** Device communication uses a symmetric SHA-256 pre-shared key header (`x-device-credential`) rather than asymmetric cryptographic key pairs `[read]`. Furthermore, `/devices/register` and `/devices/:deviceId/revoke` are completely unauthenticated `[read]`.
4. **Audit Architecture Gaps:** Audit logging exists via `AuditService`, but write operations are non-transactional (executed outside `$transaction`) and entries are not hash-chained (violating Decision L6) `[read]`.
5. **Missing Critical Capabilities:** Delta synchronization (`C1.6`), biometric server-side matching (`C1.7`), user invitations/activation (`C1.1`), and desktop contract domain CRUD routes (`C1.5b`) are completely absent `[read]`.

---

## 2. Structure & Infrastructure

### 2.1 Modules and Topology
The application is organized into 8 functional NestJS modules imported into `AppModule` (`bcams-be/src/app.module.ts#L12-L24`) `[read]`:
- `PrismaModule` (`src/prisma/prisma.module.ts`)
- `IdentityModule` (`src/modules/identity/identity.module.ts`)
- `SessionGateModule` (`src/modules/session-gate/session-gate.module.ts`)
- `AttendanceModule` (`src/modules/attendance/attendance.module.ts`)
- `DevicePolicyModule` (`src/modules/device-policy/device-policy.module.ts`)
- `AuditSecurityModule` (`src/modules/audit-security/audit-security.module.ts`)
- `SyncModule` (`src/modules/sync/sync.module.ts`)
- `ReportModule` (`src/modules/reports/report.module.ts`)

*Note:* A duplicate file `src/modules/audit-security/audit.security.module.ts` exists in the filesystem, representing dead code `[read]`.

### 2.2 Entry Point & Configuration
- **Entry File:** `bcams-be/src/main.ts` `[read]`
- **Bootstrap Logic:**
  ```typescript
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  ```
- **Configuration Loading:** Relies solely on native `process.env`. There is no `@nestjs/config` or centralized schema validator `[read]`.
- **Environment Variable Names:**
  - `DATABASE_URL`: PostgreSQL connection string `[read]`.
  - `PORT`: HTTP port (defaults to 3000) `[read]`.
  - *No secrets, tokens, or encryption keys are configured in `.env.example` `[read]`.*

### 2.3 Containerization, CI & Deployment
- **Docker / Docker Compose:** None present in repository (`Dockerfile` and `docker-compose.yml` absent) `[read]`.
- **CI / GitHub Actions:** No `.github/workflows` directory exists `[read]`.
- **Package Management:** Configured for `pnpm` (`pnpm-lock.yaml` present, `package.json` scripts use `nest` and `jest`) `[read]`.

---

## 3. Authentication & Credential Architecture

### 3.1 Authentication Mechanism
- **Implementation Status:** `absent` (Replaced by dev mock headers) `[read]`.
- **Mechanic:** There are no login, token generation, or session verification endpoints `[read]`. In `RolesGuard` (`src/common/guards/roles.guard.ts#L43-L47`), the user identity is read directly from the incoming header:
  ```typescript
  const userId = request.headers['x-user-id'] as string;
  ```
- **Password Hashing:** None. There are no password fields on the `Person` model, and no password hashing dependencies (`bcrypt`, `argon2`, etc.) in `package.json` `[read]`.
- **Token Type & Lifetime:** No JWT or bearer token infrastructure exists. The desktop `HttpApiAdapter` sends `Authorization: Bearer <token>`, but the backend completely ignores `Authorization` headers `[read]`.

### 3.2 Security Bypasses & Privilege Escalation Risks
- **Header-Based Admin Escalation (`src/common/guards/roles.guard.ts#L68-L74`) `[read]`:**
  ```typescript
  const clientRoleClaim = request.headers['x-user-role-claim'] as string;
  if (person.email?.endsWith('@admin.institution.edu') || clientRoleClaim === Role.SUPER_ADMINISTRATOR) {
    roles.push(Role.SUPER_ADMINISTRATOR);
    isSuperAdmin = true;
  }
  ```
  *Impact:* Any client can grant itself `SUPER_ADMINISTRATOR` status simply by providing `x-user-role-claim: SUPER_ADMINISTRATOR` or an email ending in `@admin.institution.edu`!
- **Header-Based HOD Escalation (`src/common/guards/roles.guard.ts#L82-L94`) `[read]`:**
  A client can claim `Role.HOD` by sending `x-user-role-claim: HOD`.

---

## 4. Authorization & Scoping

### 4.1 Role Model
Defined in `src/common/decorators/roles.decorator.ts#L3-L10` `[read]`:
- `SUPER_ADMINISTRATOR`
- `HOD`
- `LECTURER`
- `CLASS_REP` (In conflict with Decision L15 which specifies Session Capturer is a capability on a Student)
- `STUDENT`
- `STAFF`

### 4.2 Department Scoping
- Enforced in `RolesGuard` via `@RequireDepartmentScope('paramKey')` decorator `[read]`.
- For `HOD` roles, the guard validates that the target department ID specified in route params, query, or body is contained within the user's assigned departments (`RolesGuard#L123-L134`) `[read]`.
- `SUPER_ADMINISTRATOR` bypasses all department scope checks `[read]`.

---

## 5. Core Subsystems State Assessment

| Subsystem | Status Vocabulary | Technical Assessment |
| :--- | :--- | :--- |
| **Audit** | `partial` | `AuditService.log` appends `AuditLogEntry` records and `AuditController` provides `GET /audit-logs`. However, logging is non-transactional (not wrapped in `$transaction`), entries lack SHA-256 hash chaining (Decision L6), and no retention policy exists (O8) `[read]`. |
| **Device Management** | `partial` | Lifecycle status tracking exists (`REGISTERED`, `ACTIVE`, `SUSPENDED`, `REVOKED`, `RETIRED`). However, registration is open and unauthenticated (`/devices/register`), request signing uses HMAC-SHA256 with pre-shared keys rather than asymmetric public/private keys (Decision L3), and scanner serials are unmodeled `[read]`. |
| **Sync** | `partial` | Batch ingestion (`POST /sync/batch`) handles attendance and clock events idempotently by `eventId`. However, delta pull is completely `absent` (devices cannot pull roster/policy updates), and offline lease management is missing (Decision O2) `[read]`. |
| **Offline Capabilities** | `partial` | Batch ingestion handles events captured while offline. However, offline lease verification, local cache TTL enforcement, and encrypted template distribution are absent `[read]`. |
| **Biometrics** | `partial` | Stores `templateHash` and `fingerIndex` on `BiometricEnrollment`. Enforces 2-finger minimum for activation and duplicate flagging. However, server-side matching engine is `absent`, probe template re-verification is `absent`, and scoped template distribution is `absent` (Decision L2) `[read]`. |
| **Geofence** | `implemented-unverified` | Haversine distance calculated in `geofence.util.ts`. Violations during class attendance are rejected outright with `BadRequestException` and audit logging (`AttendanceService#L84-L104`), complying with Decision L10 `[read]`. |
| **Clock Integrity** | `partial` | `CalibrationPair` records monotonic clock anchors. `ClockIntegrityService` checks elapsed time and flags resets (`UNVERIFIED`) or drift (`SUSPICIOUS`). However, drift threshold is hardcoded to 60s instead of 5 minutes (Decision O5), and per-device event hash chains are missing (Decision L9) `[read]`. |
| **Time Handling** | `partial` | Server calculates day boundaries and evaluates punctuality against effective policies. However, authenticated time anchor endpoints for clock synchronization are absent `[read]`. |

---

## 6. Background Jobs, Queues & Communications

- **Queues & Background Workers:** `absent`. No Bull, BullMQ, Redis, or Celery integrations exist `[read]`.
- **Schedulers & Cron:** `absent`. No `@nestjs/schedule` tasks exist. Session auto-expiry is only evaluated lazily upon `GET /sessions/:id` `[read]`.
- **WebSockets / Realtime:** `absent`. No `@nestjs/websockets` or Socket.io modules exist `[read]`.
- **Email & SMS:** `absent`. No Nodemailer, Resend, or Brevo adapters exist `[read]`.

---

## 7. Cross-Cutting Concerns

- **PII & Secret Logging:** Verified clean. Raw biometric templates/images are never accepted or logged; passwords do not exist; device credentials are not logged in plain text `[read]`.
- **Error Format:** Standard NestJS default error payload `{ statusCode, message, error }`. No centralized exception filter is registered `[read]`.
- **Rate Limiting:** `absent`. No `@nestjs/throttler` or IP rate-limiting guards `[read]`.
- **CORS:** `absent`. `app.enableCors()` is not invoked in `main.ts` `[read]`.
- **Security Headers:** `absent`. `helmet` is not installed or configured `[read]`.
- **Payload & Input Limits:** Relies on default Express 100kb payload limit `[read]`.
- **File Upload & CSV Import:** `absent`. No multipart handling or CSV parsers installed `[read]`.
