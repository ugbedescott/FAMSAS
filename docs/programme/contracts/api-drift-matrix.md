# BCAMS API Drift Matrix & Endpoint Reconciliation (C0.3)

**Document Version:** 1.0.0  
**Baseline Date:** October 19, 2026  
**Repositories Reconciled:** `bcams-desktop` ([src/api/types.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/api/types.ts), [src/api/http-adapter.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts)) vs `bcams-be` ([bcams-desktop/docs/programme/backend/endpoints.md](file:///Users/mac/Documents/projects/bcams-desktop/docs/programme/backend/endpoints.md))  
**Classification Vocabulary:** `match`, `shape-mismatch`, `missing-in-backend`, `missing-in-frontend`  
**Evidence Standard:** Tagged `[read]` (direct source code), `[inferred]` (cross-repository comparison), or `[unverified]`.

---

## 1. Executive Reconciliation Summary

A comprehensive reconciliation between the 50 desktop API methods (`BcamsApi` / `HttpApiAdapter`) and the 29 NestJS backend routes reveals severe architectural drift:
- **`match` (Exact route and compatible contract):** 2 methods (4.0%)
- **`shape-mismatch` (Path, payload, or response incompatibility):** 13 methods (26.0%)
- **`missing-in-backend` (Required by desktop, absent on server):** 35 methods (70.0%)
- **`missing-in-frontend` (Implemented on backend, uncalled by desktop):** 12 endpoints

```
Total Desktop API Methods: 50
├── Matches:                 2  (4%)
├── Shape Mismatches:       13 (26%)
└── Missing in Backend:     35 (70%)

Total Backend Routes:      29
├── Mapped to Desktop:      17 (59%)
└── Missing in Frontend:    12 (41%)
```

---

## 2. Global Contract Incompatibilities

### 2.1 Authentication & Credential Drift
- **Desktop Client:** Appends standard HTTP Bearer token: `Authorization: Bearer <token>` ([src/api/http-adapter.ts#L84](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L84)).
- **Backend Service:** Completely ignores the `Authorization` header. It reads unverified headers: `x-user-id` and `x-user-role-claim` ([bcams-be/src/common/guards/roles.guard.ts#L43-L74](file:///Users/mac/Documents/projects/bcams-be/src/common/guards/roles.guard.ts#L43-L74); Finding F-003). Outbound requests from desktop with Bearer tokens fail authentication on the backend unless `x-user-id` is manually attached.

### 2.2 Error Payload Schema Drift
- **Desktop Error Parser:** Expects `{ detail?: string; message?: string }` ([src/api/http-adapter.ts#L105](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L105)).
- **Backend NestJS Errors:** Emits default NestJS shape: `{ statusCode: number; message: string | string[]; error: string }`.
- **Impact:** When `message` is an array (e.g. from class-validator), desktop formats the error as `[object Object]` or `HTTP 400: Bad Request`.

### 2.3 Pagination & Collection Wrapping Drift
- **Desktop Collections:** Expects raw JSON arrays `Promise<T[]>` (e.g. `Course[]`, `Department[]`, `Student[]`).
- **Backend Standard:** Intended to return paginated envelopes `{ data: T[]; total: number; page: number; limit: number }` (partially implemented in `AuditController`). Desktop adapters contain no envelope unwrapping logic.

---

## 3. Detailed API Drift Matrix (All 50 Desktop Methods)

| # | Desktop Method | HTTP Method & Path | Backend Endpoint & Handler | Classification | Shape, Payload & Contract Differences |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | `getCurrentUser` | `GET /auth/me` | *None* | `missing-in-backend` | Backend has zero `/auth/*` routes. User profile retrieval is absent on server. |
| 2 | `getDashboardStats` | `GET /dashboard/stats` | *None* | `missing-in-backend` | No metrics aggregation endpoint exists in backend. |
| 3 | `getDepartments` | `GET /departments` | *None* | `missing-in-backend` | Department CRUD module is completely absent from backend. |
| 4 | `getDepartment` | `GET /departments/:id` | *None* | `missing-in-backend` | Department detail lookup absent from backend. |
| 5 | `createDepartment` | `POST /departments` | *None* | `missing-in-backend` | Department creation route absent from backend. |
| 6 | `getCourses` | `GET /courses` | *None* | `missing-in-backend` | Course catalog listing absent from backend. |
| 7 | `getCourseOfferings` | `GET /course-offerings` | *None* | `missing-in-backend` | CourseOffering semester scheduling absent from backend. |
| 8 | `getEligibleCoursesForStudent` | `GET /students/:id/eligible-courses` | *None* | `missing-in-backend` | Student capturer eligible course calculation absent from backend. |
| 9 | `createCourse` | `POST /courses` | *None* | `missing-in-backend` | Course creation absent from backend. |
| 10 | `getStudents` | `GET /students` | *None* | `missing-in-backend` | Student registry listing absent from backend. |
| 11 | `getStudent` | `GET /students/:id` | `GET /identity/persons/:personId`<br>`(IdentityController.getPerson)` | `shape-mismatch` | **Path Mismatch:** `/students/:id` vs `/identity/persons/:personId`.<br>**Shape Mismatch:** Desktop expects unified `Student` model (with `matricNumber`, `level`, `courseEnrollments`). Backend returns generic `Person` with `biometricEnrollment` summary and separate relation joins. |
| 12 | `createStudent` | `POST /students` | `POST /identity/students`<br>`(IdentityController.createStudent)` | `shape-mismatch` | **Path Mismatch:** `/students` vs `/identity/students`.<br>**Payload Mismatch:** Desktop sends flat `{ matricNumber, fullName, departmentId, level }`. Backend `CreateStudentDto` requires `{ firstName, lastName, matricNumber, departmentId, level }`. |
| 13 | `updateStudent` | `PATCH /students/:id` | *None* | `missing-in-backend` | Student modification endpoint absent from backend. |
| 14 | `bulkImportStudents` | `POST /students/bulk-import` | *None* | `missing-in-backend` | Universal CSV bulk ingestion absent from backend. |
| 15 | `getAcademicEnrollments` | `GET /academic/enrollments` | *None* | `missing-in-backend` | Academic level progression & session enrollment records absent from backend. |
| 16 | `createAcademicEnrollment` | `POST /academic/enrollments` | *None* | `missing-in-backend` | Academic enrollment creation absent from backend. |
| 17 | `getLecturers` | `GET /lecturers` | *None* | `missing-in-backend` | Lecturer directory listing absent from backend. |
| 18 | `getLecturer` | `GET /lecturers/:id` | *None* | `missing-in-backend` | Lecturer detail lookup absent from backend. |
| 19 | `createLecturer` | `POST /lecturers` | `POST /identity/lecturers`<br>`(IdentityController.createLecturer)` | `shape-mismatch` | **Path Mismatch:** `/lecturers` vs `/identity/lecturers`.<br>**Payload Mismatch:** Desktop sends `{ staffId, fullName, departmentId }`. Backend requires `{ firstName, lastName, staffNumber, departmentId }`. |
| 20 | `linkStaffToLecturer` | `POST /staff/:id/link-lecturer` | *None* | `missing-in-backend` | Dedicated staff-to-lecturer promotion endpoint absent from backend (backend reuses `POST /identity/lecturers` with `personId`). |
| 21 | `getStaff` | `GET /staff` | *None* | `missing-in-backend` | Non-academic staff registry listing absent from backend. |
| 22 | `getStaffMember` | `GET /staff/:id` | *None* | `missing-in-backend` | Staff detail lookup absent from backend. |
| 23 | `createStaff` | `POST /staff` | `POST /identity/staff`<br>`(IdentityController.createStaff)` | `shape-mismatch` | **Path Mismatch:** `/staff` vs `/identity/staff`.<br>**Payload Mismatch:** Desktop sends `{ staffId, fullName, designation }`. Backend requires `{ firstName, lastName, staffNumber, departmentId, staffType }`. |
| 24 | `getSessions` | `GET /sessions` | *None* | `missing-in-backend` | Filtered session listing by course offering is absent from backend. |
| 25 | `getSession` | `GET /sessions/:id` | `GET /sessions/:id`<br>`(SessionGateController.getSession)` | `shape-mismatch` | **Status Enum Mismatch:** Desktop uses lowercase `state` (`draft`, `authorized`, `active`, `closed`, `expired`). Backend uses uppercase `status` (`DRAFT`, `AUTHORIZED`, `ACTIVE`, `CLOSED`, `EXPIRED`).<br>**Field Mismatch:** Desktop expects `lecturerName`, `courseCode`, `attendanceCount`. Backend returns relational entity IDs. |
| 26 | `createSession` | `POST /sessions` | `POST /sessions`<br>`(SessionGateController.createSession)` | `shape-mismatch` | **Payload Mismatch:** Desktop sends `Session` object directly into active/draft state. Backend `CreateSessionDto` requires `{ courseOfferingId, venue, conductedByLecturerId, scheduledDurationMinutes }` and enforces initial `DRAFT` state. |
| 27 | `authorizeSession` | `POST /sessions/:id/authorize` | `POST /sessions/:id/authorize`<br>`(SessionGateController.authorizeSession)` | `match` | **Path & Purpose Match.** Payload casing difference: desktop sends `{ lecturer_id }`, backend `AuthorizeSessionDto` expects `{ lecturerId }`. |
| 28 | `activateSession` | `POST /sessions/:id/activate` | *None* | `missing-in-backend` | Backend transitions `DRAFT -> AUTHORIZED -> ACTIVE` directly inside `authorizeSession`. No standalone `/activate` endpoint exists. |
| 29 | `closeSession` | `POST /sessions/:id/close` | `POST /sessions/:id/close`<br>`(SessionGateController.closeSession)` | `shape-mismatch` | Desktop sends empty POST body. Backend `CloseSessionDto` requires `{ closedByLecturerId: string }`. |
| 30 | `closeSessionWithLecturer` | `POST /sessions/:id/close-authorized` | *None* | `missing-in-backend` | Same-lecturer biometric closure verification (Rule 21) is completely absent in backend. Backend `/close` accepts any lecturer ID without biometric proof. |
| 31 | `getAttendanceEvents` | `GET /sessions/:id/attendance` | *None* | `missing-in-backend` | Raw attendance events listing for a session is absent from backend (only aggregated summary report exists). |
| 32 | `submitAttendanceCapture` | `POST /attendance/capture` | `POST /attendance/capture`<br>`(AttendanceController.captureAttendance)` | `shape-mismatch` | **Payload Mismatch:** Desktop sends `{ sessionId, studentId, studentName, matricNumber, timestamp, deviceId }`. Backend `CaptureAttendanceDto` requires `{ studentId, sessionId, capturedAt, deviceKey, probeTemplateHash, clientIntegrityStatus, deviceSignature }`. |
| 33 | `submitAttendanceBatch` | `POST /attendance/batch-sync` | `POST /sync/batch`<br>`(SyncController.syncBatch)` | `shape-mismatch` | **Path Mismatch:** `/attendance/batch-sync` vs `/sync/batch`.<br>**Payload Mismatch:** Desktop sends `{ events: AttendanceEvent[] }`. Backend requires `SyncBatchDto` `{ deviceId, syncSeq, events: SyncEventItemDto[], calibrationPair }`. |
| 34 | `getClockEvents` | `GET /gate/events` | *None* | `missing-in-backend` | Turnstile clock event audit listing absent from backend. |
| 35 | `getDailyClockRecords` | `GET /gate/daily-records` | *None* | `missing-in-backend` | Consolidated daily staff clock records table absent from backend. |
| 36 | `getGateRecords` | `GET /gate/records` | *None* | `missing-in-backend` | Super Admin gate ledger and date-range query absent from backend. |
| 37 | `recordClockEvent` | `POST /gate/clock` | `POST /gate/scan`<br>`(SessionGateController.processGateScan)` | `shape-mismatch` | **Path Mismatch:** `/gate/clock` vs `/gate/scan`.<br>**Payload Mismatch:** Desktop sends client-calculated `ClockEvent` `{ staffId, type: 'clock_in', punctuality: 'on-time' }`. Backend requires `GateScanDto` `{ staffNumber, scanTimestamp, deviceKey, deviceSignature }`. |
| 38 | `getDevices` | `GET /devices` | `GET /devices`<br>`(PolicyController.listDevices)` | `shape-mismatch` | **Response Mismatch:** Desktop expects frontend `Device` model with `lifecycleState`, `assignedScope`, and `scannerConnected`. Backend returns Prisma `Device` model. |
| 39 | `getDevice` | `GET /devices/:id` | *None* | `missing-in-backend` | Single device lookup absent from backend. |
| 40 | `registerDevice` | `POST /devices` | `POST /devices/register`<br>`(DeviceRegistrationController.registerDevice)` | `shape-mismatch` | **Path Mismatch:** `/devices` vs `/devices/register`.<br>**Contract Mismatch:** Desktop sends full endpoint definition. Backend takes `{ deviceSerial, platform, osVersion }` and returns `{ deviceId, sharedSecret }`. |
| 41 | `updateDeviceLifecycle` | `PATCH /devices/:id/lifecycle` | *None* | `missing-in-backend` | Device lifecycle state transition (`active -> suspended -> revoked`) absent from backend. |
| 42 | `updateDeviceStatus` | `PATCH /devices/:id/status` | `PATCH /devices/:id/status`<br>`(PolicyController.updateDeviceStatus)` | `match` | **Path & Purpose Match.** Updates `DeviceStatus` enum on server. |
| 43 | `getPolicies` | `GET /policies` | *None* | `missing-in-backend` | Policy catalog listing route absent from backend (backend only supports resolving a single policy by type). |
| 44 | `createPolicy` | `POST /policies` | `POST /policies`<br>`(PolicyController.createPolicyVersion)` | `shape-mismatch` | **Payload Mismatch:** Desktop sends flat `{ type, scope, value, effectiveFrom }`. Backend `CreatePolicyDto` expects `{ type, scope, scopeId, effectiveFrom, rules: [{ ruleKey, ruleValue }] }`. |
| 45 | `getAuditEntries` | `GET /audit` | `GET /audit-logs`<br>`(AuditController.getAuditLogs)` | `shape-mismatch` | **Path Mismatch:** `/audit` vs `/audit-logs`.<br>**Response Mismatch:** Desktop expects raw `AuditEntry[]`. Backend returns paginated object `{ data, total, page, limit }`. |
| 46 | `getFingerEnrollments` | `GET /people/:id/biometrics` | `GET /identity/persons/:personId`<br>`(IdentityController.getPerson)` | `shape-mismatch` | **Path Mismatch:** Dedicated biometrics route vs generic person profile. Backend does not return individual finger position states. |
| 47 | `saveFingerEnrollment` | `POST /people/:id/biometrics` | `POST /identity/persons/:personId/biometrics`<br>`(IdentityController.enrollBiometrics)` | `shape-mismatch` | **Payload Mismatch:** Desktop sends `{ position: 'left_thumb', enrolled: true, quality: 92 }`. Backend `EnrollBiometricDto` expects `{ fingerIndex: number, templateData: string, nfiqQuality: number }`. |
| 48 | `getSyncState` | `GET /sync/status` | *None* | `missing-in-backend` | Sync health and workstation queue status absent from backend. |
| 49 | `batchSync` *(Helper)* | `POST /attendance/batch-sync` | `POST /sync/batch`<br>`(SyncController.syncBatch)` | `shape-mismatch` | Redundant alias of method #33; identical path and payload mismatch. |
| 50 | `setMockUser` / Auth Helpers | Client Internal | *None* | `missing-in-backend` | Mock persona switching is purely client-side; no backend auth session endpoint exists. |

---

## 4. Backend Orphan Routes (Missing in Frontend)

The following 12 endpoints are implemented in `bcams-be` but are **completely uncalled** by `bcams-desktop`:

| # | Backend Method & Route | Controller Handler | Purpose & Gap Analysis |
| :- | :--- | :--- | :--- |
| 1 | `GET /health` | `AppController.getHealth` | Database health probe. Desktop never checks backend database liveness before launching. |
| 2 | `POST /devices/:id/revoke` | `DeviceRegistrationController.revokeDevice` | Device revocation endpoint. Desktop calls `updateDeviceLifecycle` instead. |
| 3 | `GET /devices/protected-stub` | `DeviceRegistrationController.getProtectedStub` | Dead debug route left in production backend controller. |
| 4 | `GET /policies/resolve` | `PolicyController.resolvePolicy` | Resolves effective policy version for target date. Desktop does not call this (calculates rules locally). |
| 5 | `GET /attendance/sessions/:id/report` | `AttendanceController.getSessionReport` | Aggregated class session report with attendance percentages. Desktop calculates summaries client-side. |
| 6 | `GET /reports/class/student/:id` | `ReportController.getStudentClassReport` | Student multi-course attendance report. Uncalled by desktop. |
| 7 | `GET /reports/class/course/:offeringId` | `ReportController.getCourseClassReport` | Course offering attendance rollup. Uncalled by desktop. |
| 8 | `GET /reports/class/department/:deptId` | `ReportController.getDepartmentClassReport` | Departmental attendance summary. Uncalled by desktop. |
| 9 | `GET /reports/class/institution` | `ReportController.getInstitutionClassReport` | Institution-wide class metrics. Uncalled by desktop. |
| 10 | `GET /reports/gate/staff/:id` | `ReportController.getStaffGateReport` | Staff punctuality rate report. Uncalled by desktop. |
| 11 | `GET /reports/gate/department/:deptId` | `ReportController.getDepartmentGateReport` | Departmental staff gate rollup. Uncalled by desktop. |
| 12 | `GET /reports/gate/institution` | `ReportController.getInstitutionGateReport` | Institution-wide staff gate rollup. Uncalled by desktop. |

---

## 5. Contract Remediation Action Plan (For Chunk C1.5b)

To achieve client-server compliance without breaking desktop UI workflows:
1. **Adopt Canonical Path Structure in Backend:**
   Create missing REST resources under canonical prefixes: `/auth/me`, `/departments`, `/courses`, `/course-offerings`, `/students`, `/academic/enrollments`, `/lecturers`, `/staff`, `/gate/events`, `/gate/records`.
2. **Reconcile Batch Sync Path:**
   Standardize offline replay route on `POST /sync/batch` across both frontend and backend.
3. **Implement Unified DTOs with Validation:**
   Decorate all inbound backend DTOs with `class-validator` and register global `ValidationPipe` with `{ whitelist: true, transform: true }`.
4. **Standardize Session Status & Enums:**
   Harmonize desktop lowercase string unions (`'draft' | 'active' | ...`) with Prisma uppercase enums (`DRAFT | ACTIVE | ...`) via an automated serializer/deserializer.
