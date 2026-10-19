# BCAMS Backend Salvage Verdict

**Document Version:** 1.0.0  
**Date of Snapshot:** October 19, 2026  
**Scope:** Per-Module and Per-Prisma-Model Verdicts (Keep, Refactor, or Replace)  
**Evidence Standard:** All claims tagged `[read]`, `[inferred]`, or `[unverified]`.

---

## 1. Executive Salvage Strategy

The existing NestJS backend codebase represents a **functional domain prototype** with strong domain modeling for students, lecturers, sessions, and punctuality rules. However, it lacks production-grade security, real authentication, asymmetric device cryptography, delta sync, and server-side biometric matching.

**Overall Architectural Recommendation: SALVAGE & TARGETED REFACTOR (Not Wholesale Rewrite).**
- Core business logic (attendance calculation, punctuality classification, geofence validation, and policy versioning) is high quality, well-typed, and covered by passing unit tests.
- We will salvage and retain the core services, while refactoring guards, adding a real `AuthModule`, replacing the insecure device registration controller, and upgrading data models to fulfill Locked Decisions L1–L16.

---

## 2. Module-by-Module Verdicts

| Module / Area | Verdict | Detailed Reason & Deficit Analysis | Estimated Effort | Target Chunk |
| :--- | :--- | :--- | :--- | :--- |
| **`AppModule` / Root** (`src/main.ts`, `app.module.ts`) | **REFACTOR** | Missing global `ValidationPipe`, CORS, Helmet security headers, OpenAPI/Swagger configuration, and centralized exception filter `[read]`. | Medium (1 day) | `C1.0`, `C1.9` |
| **`IdentityModule`** (`src/modules/identity/`) | **REFACTOR** | Person, Student, Lecturer, and Staff creation logic is solid `[read]`. Refactor to: add DTO validation decorators, restrict staff registration exclusively to Super Admin, and separate biometric enrollment into a dedicated `BiometricsModule`. | Medium (1–2 days) | `C1.1`, `C1.5b` |
| **`SessionGateModule`** (`src/modules/session-gate/`) | **REFACTOR** | Session state machine (DRAFT -> AUTHORIZED -> ACTIVE -> CLOSED/EXPIRED) and punctuality logic are well implemented `[read]`. Refactor `gate.service.ts` to strictly ignore third same-day scans without audit logging (L11), enforce same-lecturer closure, and bind Session Capturer to Student capability (L15). | Medium (2 days) | `C1.5` |
| **`AttendanceModule`** (`src/modules/attendance/`) | **REFACTOR** | Geofencing outright rejection and repeat-scan deduplication work well `[read]`. Refactor to add DTO validation, align role decorators with student capturer capabilities, and expose attendance query endpoints for desktop. | Low (1 day) | `C1.5`, `C1.5b` |
| **`AuditSecurityModule`** (`src/modules/audit-security/`) | **REFACTOR** | Delete dead duplicate file `audit.security.module.ts` `[read]`. Refactor `AuditService` to support transactional execution (`$transaction`) and SHA-256 hash chaining (L6). Refactor `SecurityService` for asymmetric key verification (L3). | Medium (2 days) | `C1.3`, `C1.4` |
| **`DevicePolicyModule`** (`src/modules/device-policy/`) | **REPLACE / MAJOR REFACTOR** | `DeviceRegistrationController` has unauthenticated register/revoke endpoints and symmetric pre-shared keys `[read]`. Replace device onboarding with Super Admin-governed registration, asymmetric public key binding, scanner serial binding (L3), and kiosk role enforcement (L4). Retain versioned `PolicyService` (clean logic). | High (3 days) | `C1.4` |
| **`SyncModule`** (`src/modules/sync/`) | **REFACTOR** | Batch push ingestion and monotonic clock calibration math are solid `[read]`. Refactor to: build delta pull endpoint (biometrics, policies, rosters), implement 7-day offline lease tracking (O2), add per-device event hash chaining (L9), and update clock drift threshold to 5 minutes (O5). | High (3 days) | `C1.6` |
| **`ReportModule`** (`src/modules/reports/`) | **REFACTOR** | Rollup logic for courses and departments is accurate `[read]`. Refactor to remove HOD access to staff gate reports (O4, Super Admin only). | Low (1 day) | `C1.5b` |

### New Modules Required
1. **`AuthModule` (NEW — Chunk `C1.1`):** Invitation tokens, password hashing (Argon2), JWT access/refresh tokens, activation code fallback, Super Admin MFA, and step-up auth (L8).
2. **`BiometricsModule` (NEW — Chunk `C1.7`):** AES-256-GCM template encryption at rest, server-side matching engine adapter, 1:N duplicate detection, and scoped template distribution (L2, L14).
3. **`AcademicModule` (NEW — Chunk `C1.5b`):** Department, Course, CourseOffering, and Enrollment CRUD controllers, plus CSV bulk import to fulfill desktop `BcamsApi` contracts.
4. **`ReviewQueueModule` (NEW — Chunk `C1.8`):** Acknowledge-only queue for suspicious clock and attendance events (L12).

---

## 3. Prisma Data Model Verdicts (18 Models)

| Model Name | Verdict | Rationale & Required Modifications |
| :--- | :--- | :--- |
| **`Person`** | **KEEP** | Excellent base identity model supporting multi-specialization (Lecturer + Staff reuse). |
| **`Department`** | **KEEP** | Normalized and clean. Meets institutional schema requirements. |
| **`Student`** | **KEEP** | Well-modeled permanent identity with matriculation unique constraint. |
| **`Lecturer`** | **KEEP** | Clean link to Person and Department. |
| **`Staff`** | **KEEP** | Properly supports non-teaching and teaching staff records. |
| **`Course`** | **KEEP** | Clean course definition with departmental ownership. |
| **`CourseOffering`** | **KEEP** | Properly models semester and academic session temporal offerings. |
| **`Enrollment`** | **KEEP** | Clean join table for student course registrations. |
| **`LecturerAssignment`** | **KEEP** | Clean join table for primary and secondary lecturer assignments. |
| **`Session`** | **REFACTOR** | Add `authorizedLecturerPersonId` and closure signature to enforce same-lecturer closure; update capturer binding from arbitrary user to Student capability (L15). |
| **`AttendanceEvent`** | **REFACTOR** | Add `deviceSequenceNumber` and `previousEventHash` to enable per-device hash-chain verification (L9). |
| **`StaffRecord`** | **KEEP** | Clean employment metadata model. |
| **`ClockEvent`** | **REFACTOR** | Add `deviceSequenceNumber` and `previousEventHash` to enable per-device hash-chain verification (L9). |
| **`Device`** | **REFACTOR** | Replace `credentialHash` with `publicKey` (PEM/Base64). Add `scannerSerial` (bound scanner serial per L3), `deviceRole` (`GATE_TERMINAL` vs `WORKSTATION` per L4), and `leaseExpiresAt` (O2). |
| **`BiometricEnrollment`** | **REFACTOR** | Replace raw `templateHash` with encrypted payload (`encryptedTemplate`, `encryptionIv`, `algorithm`, `version`) per L2 and L14. |
| **`CalibrationPair`** | **KEEP** | Perfectly captures server time vs device monotonic clock milliseconds (FR-4.1). |
| **`AuditLogEntry`** | **REFACTOR** | Add `previousHash`, `hash` (SHA-256), and `sequenceNumber` to guarantee tamper-evident hash chaining (L6). |
| **`Policy`** | **KEEP** | Effective-date versioning model is well designed and handles institutional overrides cleanly. |

### New Models Required in Migration `C1.0`
1. **`UserAccount`**: For user login credentials, invitation tokens, hashed passwords, MFA secrets, and step-up authentication (L8).
2. **`OfflineLease`**: For tracking 7-day cryptographic leases issued to capture endpoints (O2).
3. **`ReviewQueueEntry`**: For administrative acknowledgment notes on flagged events (L12, C1.8).
