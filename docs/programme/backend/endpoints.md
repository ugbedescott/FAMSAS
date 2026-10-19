# BCAMS Backend API Surface & Endpoint Inventory

**Document Version:** 1.0.0  
**Date of Snapshot:** October 19, 2026  
**Reconciliation Status:** Fully Reconciled (Framework Route Count: 29, Manual Controller Count: 29)  
**Evidence Standard:** All claims tagged `[read]`, `[inferred]`, or `[unverified]`.

---

## 1. Route Reconciliation Summary

The backend route table was introspected directly through NestJS metadata reflection on all controller prototypes and cross-referenced with manual static code inspection:
- **Total Controllers:** 9 `[read]`
- **Framework Introspected Routes:** 29 `[read]`
- **Manual Code Count:** 29 `[read]`
- **Reconciliation Verdict:** 100% matched, zero discrepancies.

---

## 2. Complete API Surface Inventory

| # | Method | Path | Controller & Handler | Request DTO | Validation | Guards | Allowed Roles / Decorators | Notes |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `GET` | `/health` | `AppController.getHealth` | None | None | None | Public | Executes `SELECT 1` on DB `[read]`. |
| 2 | `POST` | `/identity/students` | `IdentityController.createStudent` | `CreateStudentDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD` (`@RequireDepartmentScope`) | Creates Person + Student `[read]`. |
| 3 | `POST` | `/identity/lecturers` | `IdentityController.createLecturer` | `CreateLecturerDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD` (`@RequireDepartmentScope`) | Creates Person + Lecturer `[read]`. |
| 4 | `POST` | `/identity/staff` | `IdentityController.createStaff` | `CreateStaffDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD` | Supports Lecturer reuse (`personId`) `[read]`. |
| 5 | `POST` | `/identity/persons/:personId/biometrics` | `IdentityController.enrollBiometrics` | `EnrollBiometricDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD` | Stores template hash, tracks 2-finger minimum `[read]`. |
| 6 | `GET` | `/identity/persons/:personId` | `IdentityController.getPerson` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `LECTURER` | Returns person + biometric metadata (no raw template) `[read]`. |
| 7 | `POST` | `/sessions` | `SessionGateController.createSession` | `CreateSessionDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `LECTURER` | Creates session in `DRAFT` status `[read]`. |
| 8 | `POST` | `/sessions/:id/authorize` | `SessionGateController.authorizeSession` | `AuthorizeSessionDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `LECTURER` | Activates session; enforces 1 active session per course offering `[read]`. |
| 9 | `POST` | `/sessions/:id/close` | `SessionGateController.closeSession` | `CloseSessionDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `LECTURER` | Closes session explicitly `[read]`. |
| 10 | `GET` | `/sessions/:id` | `SessionGateController.getSession` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `LECTURER` | Returns session; lazily auto-expires if duration > 180m `[read]`. |
| 11 | `POST` | `/gate/scan` | `SessionGateController.processGateScan` | `GateScanDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `STAFF` | 1st scan = IN, 2nd scan = OUT, 3rd scan = logs audit (violates L11) `[read]`. |
| 12 | `POST` | `/attendance/capture` | `AttendanceController.captureAttendance` | `CaptureAttendanceDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `LECTURER`, `CLASS_REP` | Rejects geofence violations outright; repeat scans return existing `[read]`. |
| 13 | `GET` | `/attendance/sessions/:sessionId/report` | `AttendanceController.getSessionReport` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `LECTURER` | Calculates % attendance, derives absence dynamically `[read]`. |
| 14 | `PATCH` | `/devices/:id/status` | `PolicyController.updateDeviceStatus` | `UpdateDeviceStatusDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR` | Transitions device lifecycle status `[read]`. |
| 15 | `GET` | `/devices` | `PolicyController.listDevices` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR` | Lists all registered devices `[read]`. |
| 16 | `POST` | `/policies` | `PolicyController.createPolicyVersion` | `CreatePolicyDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR` | Creates versioned policy with `effectiveFrom` `[read]`. |
| 17 | `GET` | `/policies/resolve` | `PolicyController.resolvePolicy` | `ResolvePolicyQueryDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `LECTURER` | Resolves effective policy version for target date `[read]`. |
| 18 | `POST` | `/devices/register` | `DeviceRegistrationController.registerDevice` | `RegisterDeviceDto` | None | **NONE** (Unprotected!) | Public | Generates SHA-256 pre-shared credential (Security Flaw) `[read]`. |
| 19 | `POST` | `/devices/:deviceId/revoke` | `DeviceRegistrationController.revokeDevice` | None | None | **NONE** (Unprotected!) | Public | Revokes device without authentication (Security Flaw) `[read]`. |
| 20 | `GET` | `/devices/protected-stub` | `DeviceRegistrationController.getProtectedStub` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD` | Unused test stub left in production controller `[read]`. |
| 21 | `GET` | `/audit-logs` | `AuditController.getAuditLogs` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD` | Paginated query on `AuditLogEntry` `[read]`. |
| 22 | `POST` | `/sync/batch` | `SyncController.syncBatch` | `SyncBatchDto` | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `LECTURER`, `STAFF` | Ingests offline attendance & clock batches + calibration pair `[read]`. |
| 23 | `GET` | `/reports/class/student/:id` | `ReportController.getStudentClassReport` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `LECTURER` | Student class attendance report across enrolled offerings `[read]`. |
| 24 | `GET` | `/reports/class/course/:offeringId` | `ReportController.getCourseClassReport` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD`, `LECTURER` | Course offering session attendance rollup `[read]`. |
| 25 | `GET` | `/reports/class/department/:deptId` | `ReportController.getDepartmentClassReport` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD` | Departmental class attendance summary `[read]`. |
| 26 | `GET` | `/reports/class/institution` | `ReportController.getInstitutionClassReport` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR` | Institution-wide class metrics `[read]`. |
| 27 | `GET` | `/reports/gate/staff/:id` | `ReportController.getStaffGateReport` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD` | Staff gate punctuality rate (violates Decision O4 for HOD) `[read]`. |
| 28 | `GET` | `/reports/gate/department/:deptId` | `ReportController.getDepartmentGateReport` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR`, `HOD` | Departmental staff gate rollup (violates Decision O4 for HOD) `[read]`. |
| 29 | `GET` | `/reports/gate/institution` | `ReportController.getInstitutionGateReport` | None | None | `DeviceAuthGuard`, `RolesGuard` | `SUPER_ADMINISTRATOR` | Institution-wide staff gate rollup `[read]`. |

---

## 3. Request Validation Status

All DTOs across the application are plain TypeScript classes **completely lacking `class-validator` decorators** (`@IsString()`, `@IsNotEmpty()`, `@IsNumber()`, etc.) `[read]`. Furthermore, `ValidationPipe` is **not registered globally** in `main.ts` `[read]`. As a result:
- Any arbitrary payload shapes, malformed JSON, or missing required fields will pass directly into service methods unvalidated.
- Type coercion is non-existent on route parameters and query strings.

---

## 4. Desktop Client Contract Deficit (Missing API Surface)

Comparison against `BcamsApi` (`bcams-desktop/src/api/types.ts`):

| Desktop API Requirement | Backend Status | Gap Description | Required In Chunk |
| :--- | :--- | :--- | :--- |
| `getCurrentUser()` | `absent` | No authentication endpoints (`/auth/me`, `/auth/login`) exist `[read]`. | C1.1 |
| `getDashboardStats()` | `absent` | No dashboard metrics endpoint exists `[read]`. | C1.5b |
| `getDepartments()`, `getDepartment()`, `createDepartment()` | `absent` | No Department CRUD controller exists `[read]`. | C1.5b |
| `getCourses()`, `getCourseOfferings()`, `getEligibleCoursesForStudent()`, `createCourse()` | `absent` | No Course or CourseOffering management controllers exist `[read]`. | C1.5b |
| `getStudents()`, `getStudent()`, `updateStudent()`, `bulkImportStudents()` | `partial` | Only `POST /identity/students` exists. Listing, editing, and CSV bulk import are completely missing `[read]`. | C1.5b |
| `getAcademicEnrollments()`, `createAcademicEnrollment()` | `absent` | No academic enrollment endpoints exist `[read]`. | C1.5b |
| `getLecturers()`, `getLecturer()`, `linkStaffToLecturer()` | `partial` | Only `POST /identity/lecturers` exists. Listing and dedicated staff-linking endpoints are missing `[read]`. | C1.5b |
| `getStaff()`, `getStaffMember()` | `partial` | Only `POST /identity/staff` exists. Listing and detail lookup are missing `[read]`. | C1.5b |
| `getSessions(courseOfferingId)` | `partial` | Only `GET /sessions/:id` exists. Session listing by course offering is missing `[read]`. | C1.5b |
| `getAttendanceEvents(sessionId)` | `absent` | No endpoint exists to query raw attendance events for a session `[read]`. | C1.5b |
| `getClockEvents()`, `getDailyClockRecords()`, `getGateRecords()` | `absent` | Only `POST /gate/scan` and aggregated reports exist. Raw gate log tables cannot be retrieved `[read]`. | C1.5b |
| `getPolicies()` | `partial` | Only `GET /policies/resolve` exists. No policy catalog listing route exists `[read]`. | C1.5b |
| `getSyncState()` | `absent` | No endpoint exists to query device sync health, lease state, or delta pull status `[read]`. | C1.6, C1.8 |
