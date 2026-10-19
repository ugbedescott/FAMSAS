# BCAMS Business Rules Catalog

**Document Reference:** `docs/programme/contracts/rules-catalog.md`  
**Programme Chunk:** C0.3 (Contract reconciliation and rule extraction)  
**Authoritative Baselines:** Locked Decisions L1 to L16, Open Decisions O1 to O12, PRD v1.3, SRS v1.1  
**Scope:** `bcams-desktop` at `./bcams-desktop` and `bcams-be` at `./bcams-be`

---

## 1. Executive Summary & Purpose

This catalog provides an exhaustive, authoritative specification of all business rules governing BCAMS. Historically, business logic drifted across mock adapters, client UI components, state stores, and partial backend implementations.

Under **Locked Decision L5**, the backend server is authoritative for punctuality, clock integrity, geofence re-evaluation, and attendance qualification. Client-side evaluations are strictly advisory for low-latency offline user feedback.

This catalog serves as:
1. The **Backend Test Specification** for Phase 1 (`C1.5 Domain integrity and server-authoritative rules`).
2. The **Desktop Contract Baseline** for Phase 2 (`C2.7 Local-first workflows`).
3. The **Traceability Matrix** reconciling code against locked architectural decisions and PRD/SRS requirements.

---

## 2. Business Rules Catalog

### R-001: Attendance Qualification Rate Computation & Status Tiers

- **Rule ID:** `R-001`
- **Rule Name:** Attendance Qualification Rate Computation & Status Tiers
- **Plain-Language Specification:**  
  A student's attendance percentage for an academic offering is computed as `Math.round((attended / total) * 100)`. If total eligible sessions is 0, the percentage is 0%. Attendance health is categorized into four discrete tiers:
  - **Excellent:** $\ge 90\%$
  - **Good:** $\ge 75\%$ and $< 90\%$
  - **Warning:** $\ge 60\%$ and $< 75\%$
  - **Critical:** $< 60\%$
- **Current Locations:**
  - Client: `bcams-desktop/src/domain/attendance-rules.ts#computeAttendanceRate` `[read]`
  - UI: `bcams-desktop/src/pages/reports/index.tsx#L131-L138` `[read]`
  - Backend: `bcams-be/src/modules/attendance/attendance.service.ts#getSessionReport` `[read]` (computes percentage only; status tiers absent)
- **Required Location under L5:**  
  Server authoritative (`AttendanceService.computeAttendanceRate` / `ReportService.getSessionReport`). Client receives authoritative status from server or computes identical advisory display offline.
- **Test Specification (Given / When / Then):**
  - *Standard Case:* Given a student has attended 9 out of 10 completed course sessions, When attendance rate is evaluated, Then percentage is 90% and status tier is `'excellent'`.
  - *Boundary Case:* Given a student has attended 6 out of 8 sessions (75.0%), When evaluated, Then status tier is `'good'`; if attended 5 out of 8 sessions (62.5% $\to$ rounded to 63%), Then status tier is `'warning'`.
  - *Edge Case (Zero Sessions):* Given 0 course sessions have occurred, When evaluated, Then percentage is 0%, attended count is 0, total is 0, and status tier is `'critical'` without division by zero.
- **Conflicts with PRD / SRS:** None. Aligns with PRD §4.6 and SRS FR-11.1.
- **Decision Alignment:** **Matches decision** (L5).

---

### R-002: Exam Eligibility Threshold & Policy Specificity Hierarchy

- **Rule ID:** `R-002`
- **Rule Name:** Course/Department/Institution Exam Eligibility Policy Hierarchy & Deficit Calculation
- **Plain-Language Specification:**  
  A student is eligible to sit for semester examinations in a course if `attendancePercentage >= requiredPercentage`. The required threshold is resolved dynamically via a three-tier specificity hierarchy:
  1. **Course Scope:** Highest priority override.
  2. **Department Scope:** Overrides institutional default if no course policy exists.
  3. **Institution Scope:** Institutional fallback default ($75\%$).  
  If ineligible, the attendance deficit is computed as `Math.max(Math.ceil((requiredPercentage / 100) * totalSessions) - attended, 0)`.
- **Current Locations:**
  - Client: `bcams-desktop/src/domain/attendance-rules.ts#evaluateEligibility` `[read]`
  - UI: `bcams-desktop/src/pages/reports/index.tsx#L118-L120` `[read]` (hardcoded CS 80% vs 70%)
  - Backend: Missing in backend (no eligibility evaluation service).
- **Required Location under L5:**  
  Server authoritative (`PolicyService.resolvePolicy` + `ReportService.evaluateExamEligibility`).
- **Test Specification (Given / When / Then):**
  - *Standard Case:* Given Department CS sets 80% threshold, course CSC 201 has no override, and a student attended 15 out of 20 sessions (75%), When eligibility is evaluated, Then requiredPercentage is 80%, eligible is `false`, and deficit is 1 session.
  - *Course Override Case:* Given Department CS sets 80%, but course CSC 499 sets 90%, When evaluated for a student with 85% attendance, Then requiredPercentage is 90% and eligible is `false`.
  - *Edge Case (Zero Sessions):* Given 0 course sessions have occurred, When eligibility is evaluated, Then eligible is `false`, attendancePercentage is 0%, and deficit is 0.
- **Conflicts with PRD / SRS:** None. Matches PRD §4.6 and SRS FR-11.2.
- **Decision Alignment:** **Matches decision** (L5).

---

### R-003: Staff Gate Arrival Punctuality & Grace Window

- **Rule ID:** `R-003`
- **Rule Name:** Staff Gate Arrival Punctuality Classification & Grace Window
- **Plain-Language Specification:**  
  Staff daily clock-in arrival is classified as `'on-time'` or `'late'`. Standard institutional hours specify an expected arrival of 09:00 AM with a 60-minute grace window (grace cutoff: 10:00:00 AM). A clock-in timestamp on or before the grace cutoff is `'on-time'`; any clock-in at 10:00:01 AM or later is `'late'`. Policies resolved dynamically: Department policy overrides Institutional policy.
- **Current Locations:**
  - Client: `bcams-desktop/src/domain/attendance-rules.ts#classifyPunctuality` `[read]`
  - Client UI: `bcams-desktop/src/pages/gate/index.tsx#L76-L77` `[read]`
  - Backend: `bcams-be/src/modules/session-gate/gate.service.ts#computePunctuality` `[read]`
- **Required Location under L5:**  
  Server authoritative (`GateService.computePunctuality` in `processGateScan`). Client displays advisory result.
- **Test Specification (Given / When / Then):**
  - *Standard Case:* Given expected start 09:00 AM and grace window 60 minutes, When staff clocks in at 09:42:15 AM, Then punctuality classification is `'ON_TIME'`.
  - *Boundary Case (Exact Cutoff):* Given cutoff 10:00:00.000 AM, When staff clocks in at exactly 10:00:00.000 AM, Then punctuality is `'ON_TIME'`. When staff clocks in at 10:00:01.000 AM, Then punctuality is `'LATE'`.
  - *Edge Case (Shift Policy Override):* Given staff member's department has an active policy setting expected start to 08:00 AM with 30m grace (cutoff 08:30 AM), When staff clocks in at 08:45 AM, Then punctuality is `'LATE'`.
- **Conflicts with PRD / SRS:** None. Aligns with SRS FR-14.1, FR-14.2.
- **Decision Alignment:** **Matches decision** (L5, L11).

---

### R-004: Staff Gate Duplicate / Third Same-Day Scan Ignored

- **Rule ID:** `R-004`
- **Rule Name:** Total Discard of Third and Subsequent Same-Day Staff Gate Scans
- **Plain-Language Specification:**  
  Per **Locked Decision L11**, staff gate operational hours record exactly one clock-in (first scan of the day) and one clock-out (second scan of the day). A third or subsequent scan on the same calendar day is **ignored totally**: it is NOT recorded in the database, NOT flagged, and NOT stored anywhere (including audit logs).
- **Current Locations:**
  - Client Kiosk: `bcams-desktop/src/pages/gate/index.tsx#L72` `[read]` (naively uses `currentHour >= 14 ? 'clock_out' : 'clock_in'` without checking scan count)
  - Backend: `bcams-be/src/modules/session-gate/gate.service.ts#L201-L210` `[read]` (creates audit log `STAFF_GATE_EXTRA_SCAN_IGNORED`)
- **Required Location under L5:**  
  Server authoritative in `GateService.processGateScan`. If existing scans for staff today $\ge 2$, return current clock-in/out records immediately without writing any database or audit log record.
- **Test Specification (Given / When / Then):**
  - *Standard Case:* Given Staff STF/CS/001 has clocked in at 08:45 and clocked out at 17:05 today, When staff scans fingerprint at gate turnstile at 17:30, Then no new `ClockEvent` row is inserted, no `AuditLog` row is created, and the response indicates scans complete for today.
  - *Boundary Case (Two Scans Allowed):* Given Staff STF/CS/001 has 1 clock-in scan today, When second scan occurs at 16:50, Then second scan is recorded as `ClockEventType.OUT`.
  - *Edge Case (Offline Queue Duplication):* Given an offline gate kiosk captures a third scan, When offline events sync to the backend, Then the backend drops the third event idempotently without creating audit or event rows.
- **Conflicts with PRD / SRS:**  
  SRS FR-13.3 previously specified audit logging extra scans. Locked Decision L11 explicitly overrides this and requires total non-recording.
- **Decision Alignment:** **Conflicts with decision** (L11). Both current client and backend conflict with L11; L11 is locked and prevails.

---

### R-005: Same-Lecturer Session Closure Biometric Authorization

- **Rule ID:** `R-005`
- **Rule Name:** Same-Lecturer Biometric Verification for Class Session Closure
- **Plain-Language Specification:**  
  An active class session can ONLY be closed upon biometric verification matching the identical lecturer identity who authorized the session start (or an approved designated substitute lecturer recorded at session start). A biometric probe from any other lecturer or individual must be rejected outright, leaving the session in the `ACTIVE` state.
- **Current Locations:**
  - Client Mock: `bcams-desktop/src/api/mock-adapter.ts#L588-L608` `[read]` (Rule 21)
  - Client UI: `bcams-desktop/src/pages/attendance/capture.tsx#L144-L160` `[read]`
  - Backend: `bcams-be/src/modules/session-gate/session.service.ts#L188-L226` `[read]` (absent; accepts closure with plain text reason without lecturer biometric verification)
- **Required Location under L5:**  
  Server authoritative in `SessionService.closeSession`. Controller must accept lecturer biometric probe/signed assertion and verify that `scannedLecturerId === session.conductingLecturerId`.
- **Test Specification (Given / When / Then):**
  - *Standard Case:* Given Session S-101 was authorized and activated by Dr. Emeka Nwosu (LEC-001), When the capturer initiates session closure with Dr. Nwosu's biometric verification, Then session status transitions to `CLOSED` and `actualEndTime` is set.
  - *Rejection Case:* Given Session S-101 was authorized by Dr. Emeka Nwosu (LEC-001), When another lecturer (Prof. Adebayo, LEC-002) attempts to biometrically close the session, Then closure is rejected with 403 Forbidden ("Closure must be authorized by Dr. Emeka Nwosu"), and session remains `ACTIVE`.
  - *Edge Case (Substitute Lecturer):* Given Session S-102 was authorized by designated substitute lecturer Dr. Fatima Bello (LEC-003) recorded in `substituteLecturerId`, When Dr. Fatima Bello provides biometric closure, Then closure succeeds.
- **Conflicts with PRD / SRS:** None. Matches PRD §4.2, §4.7 and Rule 21.
- **Decision Alignment:** **Matches decision** (L1, L2, L5). Backend implementation gap logged in F-030.

---

### R-006: Single Active Session per Course Offering Concurrency Constraint

- **Rule ID:** `R-006`
- **Rule Name:** Single Active Session per Course Offering Concurrency Constraint
- **Plain-Language Specification:**  
  A single course offering cannot have more than one concurrent `ACTIVE` session at any time across the entire institution. Attempting to authorize or activate a new session for an offering while an existing session is in `ACTIVE` status must be rejected with a 409 Conflict error.
- **Current Locations:**
  - Backend: `bcams-be/src/modules/session-gate/session.service.ts#L149-L162` `[read]`
  - Client Mock: `bcams-desktop/src/api/mock-adapter.ts#L524-L562` `[read]` (absent in mock adapter)
- **Required Location under L5:**  
  Server authoritative in `SessionService.authorizeSession` reinforced by a database partial unique constraint or transactional lock.
- **Test Specification (Given / When / Then):**
  - *Standard Case:* Given Course Offering CO-CSC201-2026 has an `ACTIVE` session S-1 in Hall A, When Capturer B attempts to activate session S-2 for CO-CSC201-2026 in Hall B, Then authorization is rejected with 409 Conflict.
  - *Sequential Case:* Given Session S-1 is closed (status `CLOSED`), When Capturer B authorizes session S-2 for the same course offering, Then authorization succeeds.
  - *Edge Case (Race Condition):* Given two capturers simultaneously submit session authorizations for the same course offering at the exact same millisecond, Then the database transaction ensures exactly one succeeds and one receives 409 Conflict.
- **Conflicts with PRD / SRS:** None. Matches SRS FR-9.3.
- **Decision Alignment:** **Matches decision** (L5).

---

### R-007: Session Auto-Expiry on Maximum Permitted Duration

- **Rule ID:** `R-007`
- **Rule Name:** Lazy & Scheduled Session Auto-Expiry on Maximum Duration
- **Plain-Language Specification:**  
  A class session has a maximum operational duration (default 120 minutes, maximum 180 minutes). If a session remains in the `ACTIVE` state beyond this duration without being explicitly closed, any subsequent retrieval or background scheduler evaluation must automatically transition the session status to `EXPIRED` and record `actualEndTime`. No attendance events can be accepted for an `EXPIRED` session.
- **Current Locations:**
  - Backend: `bcams-be/src/modules/session-gate/session.service.ts#L244-L266` `[read]` (evaluates elapsed minutes on `getSession`)
  - Client Mock: `bcams-desktop/src/api/mock-adapter.ts#L541` `[read]` (defines `maxDurationMinutes: 120`, but lacks auto-expiry evaluation)
- **Required Location under L5:**  
  Server authoritative (`SessionService.getSession` lazy evaluation + periodic cron task).
- **Test Specification (Given / When / Then):**
  - *Standard Case:* Given Session S-1 was activated at 08:00 AM with max duration 120 minutes, When current time reaches 10:30 AM (elapsed 150 minutes) and session is fetched, Then status is updated to `EXPIRED` and audit event `SESSION_AUTO_EXPIRED` is logged.
  - *Attendance Rejection Case:* Given Session S-1 has expired, When an attendance capture event timestamped 10:35 AM is submitted, Then attendance is rejected with 400 Bad Request ("Attendance events are rejected for non-ACTIVE sessions").
  - *Edge Case (Exact Boundary):* Given max duration 120 minutes, When elapsed time is exactly 119 minutes and 59 seconds, Then session remains `ACTIVE`. At 120 minutes and 1 second, session transitions to `EXPIRED`.
- **Conflicts with PRD / SRS:** None. Matches SRS FR-9.1 and PRD §4.2.
- **Decision Alignment:** **Matches decision** (L5).

---

### R-008: Class Attendance Geofence Perimeter Verification

- **Rule ID:** `R-008`
- **Rule Name:** Class Attendance Geofence Perimeter Verification & Outright Rejection
- **Plain-Language Specification:**  
  Student attendance capture during a class session is validated against the approved session venue coordinates (latitude/longitude) and approved radius (default 200m). Per **Locked Decision L10**, if the captured location is outside the approved geofence boundary, the event is **rejected outright with feedback**. (Staff gate terminals have no geofence per **Locked Decision L4**).
- **Current Locations:**
  - Backend: `bcams-be/src/modules/attendance/attendance.service.ts#L75-L104` `[read]` (Haversine calculation, rejects $> 200\text{m}$)
  - Client Mock: `bcams-desktop/src/pages/attendance/capture.tsx#L80-L85` `[read]`; `src/pages/sessions/index.tsx#L216-L223` `[read]` (simulated 38m via `setTimeout`)
- **Required Location under L5:**  
  Server authoritative re-evaluation (`AttendanceService.captureAttendance`). Client provides immediate advisory feedback if location fix is available.
- **Test Specification (Given / When / Then):**
  - *Standard Inside Case:* Given session approved at lat 6.5244, lon 3.3792 with radius 200m, When attendance capture coordinates are lat 6.5248, lon 3.3795 (distance $\approx 55\text{m}$), Then geofence check passes and attendance is recorded.
  - *Outright Rejection Case:* Given session approved radius is 200m, When student scan arrives with coordinates 350m away, Then request is rejected with 400 Bad Request ("Location is outside approved geofence boundary"), audit event `ATTENDANCE_GEOFENCE_REJECTED` is logged, and no event is recorded.
  - *Edge Case (Gate Terminal Exemption):* Given a staff gate clock event arrives without coordinates or with distant coordinates, When evaluated, Then geofence validation is bypassed per L4.
- **Conflicts with PRD / SRS:** None. Matches Locked Decision L10 and PRD §4.3.
- **Decision Alignment:** **Matches decision** (L4, L5, L10).

---

### R-009: Monotonic Clock Calibration, Anchor Loss & Drift Anomaly Detection

- **Rule ID:** `R-009`
- **Rule Name:** Monotonic Clock Anchor Integrity, Drift Anomaly Flagging & Reboot Detection
- **Plain-Language Specification:**  
  Per **Locked Decision L9** and **Decision O5**, device timestamps are validated against an authenticated server calibration pair $(T_{\text{server}}, T_{\text{mono}})$. Expected event wall-clock time is:
  $$T_{\text{expected}} = T_{\text{server}} + (T_{\text{event\_mono}} - T_{\text{mono}})$$
  - If $T_{\text{event\_mono}} < T_{\text{mono}}$ (device rebooted or monotonic clock reset), event is flagged `'unverified'`.
  - If $|T_{\text{event\_wall}} - T_{\text{expected}}| > 5\text{ minutes}$ (divergence threshold per O5), event is flagged `'suspicious'`.
  - Otherwise, event is `'verified'`.  
  Per Decision O5, suspicious and unverified events **count toward qualification while unreviewed**.
- **Current Locations:**
  - Client: `bcams-desktop/src/stores/sync-store.ts#L191-L203` `[read]` (implements $> 5\text{ minutes}$ threshold)
  - Backend: `bcams-be/src/modules/sync/clock-integrity.service.ts#L5-L79` `[read]` (hardcodes 60s threshold, conflicting with O5 - F-008)
- **Required Location under L5:**  
  Server authoritative (`ClockIntegrityService.evaluateClockIntegrity`). Client stamps provisional status.
- **Test Specification (Given / When / Then):**
  - *Verified Case:* Given device calibrated at 10:00:00 (monotonic 50,000ms), When event occurs at monotonic 110,000ms (+60s) with wall-clock 10:01:00, Then divergence is 0s and status is `'VERIFIED'`.
  - *Suspicious Drift Case:* Given calibrated device clock is manually advanced +12 minutes (wall-clock 10:13:00, monotonic elapsed 60s $\to$ expected 10:01:00), When event is processed, Then drift is 12 mins $> 5$ mins, status is `'SUSPICIOUS'`, and event is counted toward attendance.
  - *Reboot Case:* Given device reboots offline causing monotonic time to reset to 2,000ms ($< 50,000\text{ms}$), When event is processed, Then status is `'UNVERIFIED'`.
- **Conflicts with PRD / SRS:**  
  Backend `DIVERGENCE_THRESHOLD_MS = 60 * 1000` conflicts with Decision O5 (5 minutes).
- **Decision Alignment:** **Matches decision** (L9, O5). Backend requires threshold update from 60s to 300s.

---

### R-010: Anti-Duplicate Attendance Scan in Same Session

- **Rule ID:** `R-010`
- **Rule Name:** Idempotent Anti-Duplicate Scan Prevention in Class Session
- **Plain-Language Specification:**  
  A student can have at most ONE attendance event recorded per class session. If a student scans their fingerprint a second time during the same session, the server must discard the second scan idempotently and return the existing attendance event without inserting a duplicate database row.
- **Current Locations:**
  - Backend: `bcams-be/src/modules/attendance/attendance.service.ts#L118-L142` `[read]` (checks existing event and returns `isRepeatScan: true`), `prisma/schema.prisma` `@@unique([sessionId, studentId])` `[read]`
  - Client UI: `bcams-desktop/src/pages/attendance/capture.tsx#L108` `[read]`
- **Required Location under L5:**  
  Server authoritative (`AttendanceService.captureAttendance` guarded by DB constraint `@@unique([sessionId, studentId])`).
- **Test Specification (Given / When / Then):**
  - *Standard Case:* Given Student STU-001 scanned at 09:10 in Session S-1 (Event E-1 recorded), When Student STU-001 scans again at 09:35 in Session S-1, Then backend returns Event E-1 with `isRepeatScan: true`, logs audit event `ATTENDANCE_REPEAT_SCAN_IGNORED`, and no new row is created.
  - *Different Session Case:* Given Student STU-001 attended Session S-1, When Student STU-001 scans in Session S-2 on the same day, Then a valid attendance event is created for Session S-2.
  - *Edge Case (Concurrent Double Tap):* Given two scanner events for STU-001 in Session S-1 hit the backend concurrently, Then the database unique constraint `@@unique([sessionId, studentId])` guarantees exactly one insert succeeds and the other is handled as a repeat scan.
- **Conflicts with PRD / SRS:** None. Matches SRS FR-10.2.
- **Decision Alignment:** **Matches decision** (L5).

---

### R-011: Student Session Capturer Role & Capability Authorization

- **Rule ID:** `R-011`
- **Rule Name:** Student Identity Bound with Session Capture Operational Capability
- **Plain-Language Specification:**  
  Per **Locked Decision L15**, class session creation and attendance capture operations can ONLY be performed by a user whose base identity is a `Student` and who holds the `session_capture` capability assignment. Lecturers, pure students, and staff cannot launch or operate class session capture.
- **Current Locations:**
  - Client: `bcams-desktop/src/lib/permissions.ts#L32-L34, L126, L134` `[read]`
  - Backend: `bcams-be/src/common/guards/roles.guard.ts#L54` `[read]` (checks `Role.STUDENT`, but capability model is absent)
- **Required Location under L5:**  
  Server authoritative in `RolesGuard` / `SessionGateController` verifying user identity is `Student` with active `session_capture` capability.
- **Test Specification (Given / When / Then):**
  - *Standard Case:* Given user is a Student with `captureCapability: 'session_capture'`, When creating a class session for an enrolled course, Then authorization succeeds.
  - *Lecturer Rejection Case:* Given user is a Lecturer (even course lecturer), When user attempts to call `POST /sessions` to create a session, Then request is rejected with 403 Forbidden ("Lecturers authorize sessions; only student capturers create them").
  - *Regular Student Case:* Given user is a Student without `session_capture` capability, When user attempts to create a session, Then request is rejected with 403 Forbidden.
- **Conflicts with PRD / SRS:** None. Matches Locked Decision L15.
- **Decision Alignment:** **Matches decision** (L15). Backend missing capability model.

---

### R-012: Head of Department (HOD) Strict Department Scoping Boundary

- **Rule ID:** `R-012`
- **Rule Name:** Head of Department Strict Department Scoping Boundary
- **Plain-Language Specification:**  
  A Head of Department (HOD) is strictly restricted to their appointed department. An HOD can create, view, update, and manage students, lecturers, courses, course offerings, academic enrollments, and clearance reports ONLY within their own department. They cannot view or manage entities in other departments. Only Super Administrator possesses institution-wide administrative scope.
- **Current Locations:**
  - Client: `bcams-desktop/src/lib/permissions.ts#L61-L97, L200-L205` `[read]`
  - Backend: `bcams-be/src/modules/identity/identity.service.ts#L31-L50` `[read]` (`enforceDepartmentScope`)
- **Required Location under L5:**  
  Server authoritative across all controllers and service methods via `UserContext.departmentIds`.
- **Test Specification (Given / When / Then):**
  - *Authorized Department Case:* Given user is HOD of Computer Science (DEPT-CS), When HOD creates a course for DEPT-CS, Then course creation succeeds.
  - *Unauthorized Department Case:* Given user is HOD of Computer Science, When HOD attempts to register a student or create a course in Mechanical Engineering (DEPT-ME), Then request is rejected with 403 Forbidden ("Target department is outside authorized HOD department scope").
  - *List Scoping Case:* Given HOD queries `GET /students`, When processed, Then the backend automatically scopes the query to `where: { departmentId: 'DEPT-CS' }`.
- **Conflicts with PRD / SRS:** None. Matches PRD §2.2.
- **Decision Alignment:** **Matches decision** (L5).

---

### R-013: Staff Gate Attendance Ledger Restricted Exclusively to Super Admin

- **Rule ID:** `R-013`
- **Rule Name:** Staff Gate Attendance Ledger and Report Access Exclusively for Super Admin
- **Plain-Language Specification:**  
  Per **Decision O4**, staff gate clock-in/out records, turnstile audit ledgers, and staff attendance reports can ONLY be accessed or exported by Super Administrators. Heads of Department (HOD), Lecturers, Staff, and Capturers have NO access to gate attendance records.
- **Current Locations:**
  - Client: `bcams-desktop/src/App.tsx#L95` `[read]`, `src/lib/permissions.ts#L117-L119` `[read]` (`canViewGateLedger = isSuperAdmin`)
  - Backend: `bcams-be/src/modules/reports/report.controller.ts#L37-L46` `[read]` (permits `Role.HOD` - F-007)
- **Required Location under L5:**  
  Server authoritative (`RolesGuard([Role.SUPER_ADMIN])` on all `/gate/records` and `/reports/gate` endpoints).
- **Test Specification (Given / When / Then):**
  - *Super Admin Case:* Given user has role `SUPER_ADMINISTRATOR`, When querying `/api/reports/gate`, Then gate records across all departments are returned.
  - *HOD Rejection Case:* Given user has role `HOD`, When querying `/api/reports/gate` or `/api/gate/records`, Then request is rejected with 403 Forbidden ("Gate attendance ledger is restricted exclusively to Super Administrators").
  - *Lecturer Rejection Case:* Given user has role `LECTURER`, When querying gate endpoints, Then request is rejected with 403 Forbidden.
- **Conflicts with PRD / SRS:**  
  PRD originally allowed HODs to view own-department staff gate reports. Decision O4 explicitly resolved that HODs are excluded.
- **Decision Alignment:** **Matches decision** (O4). Backend conflicts with O4 (logged in F-007).

---

### R-014: Lecturer Assigned Course Scoping Boundary

- **Rule ID:** `R-014`
- **Rule Name:** Lecturer Assigned Course Scoping Boundary
- **Plain-Language Specification:**  
  Lecturers can only view class sessions, attendance rosters, and clearance analytics for course offerings to which they are formally assigned as the primary conducting lecturer or as an assigned co-lecturer. They cannot inspect session data or student attendance for courses taught by other lecturers.
- **Current Locations:**
  - Client: `bcams-desktop/src/lib/permissions.ts#L172-L173` `[read]`, `src/pages/reports/index.tsx#L85-L92` `[read]`
  - Backend: `bcams-be/src/modules/reports/report.service.ts` `[read]` (partially implemented)
- **Required Location under L5:**  
  Server authoritative in `SessionService` and `ReportService`.
- **Test Specification (Given / When / Then):**
  - *Assigned Course Case:* Given Lecturer LEC-001 is primary lecturer for CSC 201, When querying session reports for CSC 201, Then full session attendance reports are returned.
  - *Unassigned Course Case:* Given Lecturer LEC-001 is not assigned to MTH 201, When querying session reports for MTH 201, Then request is rejected with 403 Forbidden.
  - *Co-Lecturer Case:* Given Lecturer LEC-002 is listed in `assignedLecturers` for CSC 201, When querying CSC 201 reports, Then access is granted.
- **Conflicts with PRD / SRS:** None. Matches PRD §2.2.
- **Decision Alignment:** **Matches decision** (L5).

---

### R-015: Student Bulk Import Validation & Non-Destructive Progression

- **Rule ID:** `R-015`
- **Rule Name:** Student Bulk CSV Import Validation & Non-Destructive Academic Level Progression
- **Plain-Language Specification:**  
  During bulk student CSV import, each row is validated for mandatory attributes (`matricNumber`, `fullName`, `level`, `departmentId`). If a matric number already exists in the system:
  1. Do NOT duplicate or overwrite the existing `Person` or `Student` core record.
  2. Update the student's `currentLevel` and `currentSession`.
  3. Append a new `AcademicEnrollment` record for the new session/level, strictly preserving historical enrollment records.  
  If the matric number does not exist, create new `Person`, `Student`, and initial `AcademicEnrollment` records. Invalid rows must be collected in an errors array without aborting valid rows.
- **Current Locations:**
  - Client Mock: `bcams-desktop/src/api/mock-adapter.ts#L216-L315` `[read]`
  - Backend: Missing in backend (bulk import endpoint absent).
- **Required Location under L5:**  
  Server authoritative in `StudentService.bulkImportStudents` wrapped in a Prisma `$transaction`.
- **Test Specification (Given / When / Then):**
  - *Existing Student Progression Case:* Given student with matric `CSC/2024/001` exists at level 100 with enrollment record `AE-1`, When CSV import is executed with `matricNumber: 'CSC/2024/001'`, `level: 200`, `academicSession: '2026/2027'`, Then student `currentLevel` is updated to 200, a new `AcademicEnrollment` `AE-2` is inserted, and historical record `AE-1` remains untouched.
  - *New Student Case:* Given matric `CSC/2026/045` does not exist, When imported, Then a new `Person`, `Student`, and initial `AcademicEnrollment` are created with `biometricStatus: 'not_enrolled'`.
  - *Invalid Row Handling:* Given CSV with 5 valid rows and 1 row missing `fullName`, When imported, Then 5 students are imported/updated, and the response reports `importedCount: 5, errors: [{ reason: 'Missing Full Name' }]`.
- **Conflicts with PRD / SRS:** None. Matches PRD §4.1.
- **Decision Alignment:** **Matches decision** (L5). Endpoint missing in backend.

---

### R-016: Biometric Enrollment Finger Count Thresholds

- **Rule ID:** `R-016`
- **Rule Name:** Biometric Enrollment Finger Count Thresholds (Target 10, Minimum 4 for Activation)
- **Plain-Language Specification:**  
  Biometric enrollment captures templates across up to 10 distinct fingers (indices 0 to 9). Biometric lifecycle status transitions:
  - **`not_enrolled`:** 0 active enrolled fingers.
  - **`partial`:** 1 to 3 active enrolled fingers (cannot participate in biometric capture).
  - **`enrolled`:** $\ge 4$ active enrolled fingers (identity is activated and eligible for biometric verification).  
  Target institutional enrollment is 10 fingers. Re-enrolling a finger index marks previous active enrollment for that finger index as `SUPERSEDED`.
- **Current Locations:**
  - Client Domain: `bcams-desktop/src/types/domain.ts#L298` `[read]`
  - Backend: `bcams-be/src/modules/identity/identity.service.ts#L19, L294-L315` `[read]` (defines `MINIMUM_ENROLLMENT_COUNT = 2`)
- **Required Location under L5:**  
  Server authoritative in `IdentityService.enrollBiometrics`.
- **Test Specification (Given / When / Then):**
  - *Activation Threshold Case:* Given a student has 3 active enrolled fingers (status `'partial'`), When a 4th finger template is successfully enrolled, Then `activeFingerCount` reaches 4, `biometricStatus` transitions to `'enrolled'`, and student is eligible for attendance capture.
  - *Partial Enrollment Case:* Given a student enrolls 2 fingers, When evaluated against the 4-finger threshold, Then status is `'partial'` and activation flag is `false`.
  - *Re-Enrollment Case:* Given Person P-1 has active template on finger index 0, When a new template is enrolled for finger index 0, Then the old template status transitions to `SUPERSEDED`, new template is `ACTIVE`, and total active count remains unchanged.
  - *Index Boundary Case:* Given request with `fingerIndex: 10`, When submitted, Then backend rejects with 400 Bad Request ("Finger index must be between 0 and 9").
- **Conflicts with PRD / SRS:**  
  Backend code hardcodes `MINIMUM_ENROLLMENT_COUNT = 2`, whereas SRS FR-2.2 and desktop domain types specify 4-finger minimum for activation (Conflict logged as F-029).
- **Decision Alignment:** **Conflicts with decision / specification** (requires decision alignment to 4 fingers in OPEN_QUESTIONS.md).

---

### R-017: Student Capturer Mandatory Self-Attendance Recording

- **Rule ID:** `R-017`
- **Rule Name:** Student Session Capturer Mandatory Self-Attendance Recording
- **Plain-Language Specification:**  
  A Student Session Capturer who creates and operates a class attendance session is required to record their own attendance for that session. The capturer can record self-attendance directly within the operational workspace, which validates their enrolled student status and logs a standard `AttendanceEvent` bound to their student ID and the active session.
- **Current Locations:**
  - Client UI: `bcams-desktop/src/pages/attendance/capture.tsx#L91-L101, L319` `[read]`
  - Backend: Uses standard `POST /attendance/capture` endpoint.
- **Required Location under L5:**  
  Server authoritative (`AttendanceService.captureAttendance`).
- **Test Specification (Given / When / Then):**
  - *Standard Case:* Given Student Capturer STU-001 is operating Session S-101 (for a course they are enrolled in), When capturer triggers self-attendance, Then an `AttendanceEvent` is inserted for STU-001 in Session S-101 and session present count increments.
  - *Anti-Duplicate Case:* Given Capturer STU-001 already recorded self-attendance in Session S-101, When self-attendance is triggered again, Then R-010 applies and duplicate is discarded idempotently.
  - *Course Enrollment Check:* Given Capturer STU-001 is not academically enrolled in course offering CO-202, When attempting self-attendance for Session S-202, Then attendance is rejected with 400 Bad Request ("Student is not enrolled in this course offering").
- **Conflicts with PRD / SRS:** None. Matches PRD §4.7.
- **Decision Alignment:** **Matches decision** (L5, L15).

---

### R-018: Student Active Academic Standing Precondition for Attendance

- **Rule ID:** `R-018`
- **Rule Name:** Active Academic Standing Precondition for Attendance Capture
- **Plain-Language Specification:**  
  Biometric attendance capture can only be recorded for students who maintain an active academic standing (`status: 'ACTIVE'`). If a student's lifecycle status is `SUSPENDED`, `WITHDRAWN`, `EXPELLED`, or `GRADUATED`, attendance capture must be rejected.
- **Current Locations:**
  - Client Domain: `bcams-desktop/src/types/domain.ts#Student.lifecycleStatus` `[read]`
  - Backend: Partially enforced in `bcams-be/src/modules/attendance/attendance.service.ts`
- **Required Location under L5:**  
  Server authoritative (`AttendanceService.captureAttendance`).
- **Test Specification (Given / When / Then):**
  - *Suspended Student Case:* Given Student STU-099 has status `'SUSPENDED'`, When biometric scan matches STU-099 during Session S-1, Then attendance is rejected with 403 Forbidden ("Student is not in active academic standing").
  - *Active Student Case:* Given Student STU-001 has status `'ACTIVE'`, When scan matches, Then attendance is accepted.
  - *Unenrolled Course Case:* Given Student STU-001 is active in Department CS but has no `AcademicEnrollment` for course offering CO-301, When scan matches in Session S-301, Then attendance is rejected with 400 Bad Request ("Student is not enrolled in this course offering").
- **Conflicts with PRD / SRS:** None. Matches PRD §4.1.
- **Decision Alignment:** **Matches decision** (L5).

---

### R-019: Class Session Lifecycle State Machine Transitions

- **Rule ID:** `R-019`
- **Rule Name:** Class Attendance Session State Transition Lifecycle Machine
- **Plain-Language Specification:**  
  A class session must transition strictly through valid states in the session lifecycle state machine:
  $$\text{DRAFT} \longrightarrow \text{AUTHORIZED} \longrightarrow \text{ACTIVE} \longrightarrow \text{CLOSED} \quad \text{or} \quad \text{EXPIRED}$$
  - A session can only be authorized if it is in `DRAFT` (or `AUTHORIZED`) state.
  - A session can only be activated if it is in `AUTHORIZED` state.
  - A session can only accept attendance events if it is in `ACTIVE` state.
  - A session can only be closed if it is in `ACTIVE` state.
  - Terminal states (`CLOSED`, `EXPIRED`) cannot transition to any other state.
- **Current Locations:**
  - Backend: `bcams-be/src/modules/session-gate/session.service.ts#L130-L137, L201-L205` `[read]`
  - Client Mock: `bcams-desktop/src/api/mock-adapter.ts#L559, L569, L578` `[read]`
- **Required Location under L5:**  
  Server authoritative in `SessionService`.
- **Test Specification (Given / When / Then):**
  - *Valid Lifecycle:* Given a new session in `DRAFT`, When authorized with lecturer biometric match, Then status becomes `ACTIVE` and `actualStartTime` is set. When closed with same lecturer match, status becomes `CLOSED` and `actualEndTime` is set.
  - *Invalid Re-Authorization:* Given Session S-1 is in `CLOSED` state, When an authorization call is submitted, Then request is rejected with 400 Bad Request ("Session is in CLOSED state and cannot be authorized").
  - *Attendance on Closed Session:* Given Session S-1 is in `CLOSED` state, When an attendance event arrives, Then request is rejected with 400 Bad Request ("Attendance events are rejected for non-ACTIVE sessions").
- **Conflicts with PRD / SRS:** None. Matches SRS FR-9.
- **Decision Alignment:** **Matches decision** (L5).

---

### R-020: Gate Turnstile Clock Direction Determination

- **Rule ID:** `R-020`
- **Rule Name:** Staff Gate Clock Direction Determination (Sequence vs Kiosk Time-of-Day)
- **Plain-Language Specification:**  
  Per **Locked Decision L11**, clock direction at the staff gate is determined strictly by the sequence of scans recorded for the staff member on the current calendar day:
  1. **First Scan of the Day:** Clock-In (`ClockEventType.IN`).
  2. **Second Scan of the Day:** Clock-Out (`ClockEventType.OUT`).
  3. **Third and Later Scans:** Ignored totally.  
  The desktop kiosk's heuristic `currentHour >= 14 ? 'clock_out' : 'clock_in'` is invalid and must not determine event direction.
- **Current Locations:**
  - Client Kiosk: `bcams-desktop/src/pages/gate/index.tsx#L72` `[read]` (hour $\ge 14$ naive heuristic)
  - Backend: `bcams-be/src/modules/session-gate/gate.service.ts#L134-L172` `[read]` (sequence based)
- **Required Location under L5:**  
  Server authoritative in `GateService.processGateScan`. Desktop offline engine must replicate the scan-sequence counter per staff member per calendar day.
- **Test Specification (Given / When / Then):**
  - *Morning Arrival Case:* Given staff has 0 scans today, When scanning at 08:30 AM, Then event type is `ClockEventType.IN`.
  - *Early Departure Case:* Given staff clocked in at 08:30 AM (1 scan today), When scanning at 13:15 (before 14:00), Then event type is `ClockEventType.OUT`.
  - *Afternoon First Arrival Case:* Given staff arrives for the first time today at 14:30, When scanning, Then because it is the first scan today, event type is recorded as `ClockEventType.IN` (kiosk naive logic would have wrongly stamped Clock-Out).
- **Conflicts with PRD / SRS:**  
  Desktop kiosk implementation conflicts with Locked Decision L11.
- **Decision Alignment:** **Conflicts with decision** (L11 in desktop client; backend correctly implements sequence determination).

---

### R-021: Data Export Scoping and Privacy Boundary

- **Rule ID:** `R-021`
- **Rule Name:** Data Export Scoping and Privacy Boundary
- **Plain-Language Specification:**  
  All data exports (CSV downloads, printable examination clearance rosters, audit ledger dumps) must enforce the requesting actor's authoritative organizational scope:
  - **Super Administrator:** Institution-wide export.
  - **Head of Department:** Scoped strictly to the HOD's appointed department.
  - **Lecturer:** Scoped strictly to assigned course offerings.  
  Under no circumstances may an export contain raw biometric templates, biometric template hashes, device private keys, or password hashes.
- **Current Locations:**
  - Client: `bcams-desktop/src/domain/export-utils.ts` `[read]`, `src/pages/reports/index.tsx#L180-L216` `[read]`
  - Backend: Reports module.
- **Required Location under L5:**  
  Server authoritative in `ReportService` export endpoints.
- **Test Specification (Given / When / Then):**
  - *HOD Scope Case:* Given user is HOD of Department CS, When requesting student attendance CSV export, Then generated file contains only students in Department CS.
  - *Privacy Strip Case:* Given an export of student biometrics metadata, When file is generated, Then raw templates and hashes are completely omitted.
  - *Lecturer Scope Case:* Given user is Lecturer LEC-001, When exporting attendance roster, Then export contains only students enrolled in courses taught by LEC-001.
- **Conflicts with PRD / SRS:** None. Matches PRD §2.2 and SRS FR-2.5.
- **Decision Alignment:** **Matches decision** (L5, L16).

---

### R-022: Prohibition of Offline Biometric Enrollment

- **Rule ID:** `R-022`
- **Rule Name:** Prohibition of Offline Biometric Enrollment
- **Plain-Language Specification:**  
  Per **Decision O11**, biometric enrollment and re-enrollment CANNOT take place while offline. Enrollment requires an active, authenticated server connection for authoritative identity binding and institution-wide duplicate template detection. If a terminal is offline, biometric enrollment interfaces must be disabled.
- **Current Locations:**
  - Decision: `bcams-desktop/docs/programme/DECISIONS.md#L46` `[read]` (Decision O11)
  - Client Mock: `bcams-desktop/src/api/mock-adapter.ts#L814` `[read]` (currently allows mock offline enrollment)
- **Required Location under L5:**  
  Server authoritative in `IdentityService.enrollBiometrics`. Desktop client must disable enrollment flows when offline.
- **Test Specification (Given / When / Then):**
  - *Online Case:* Given workstation is online and authenticated as Super Admin, When enrolling biometrics, Then request is sent to backend, verified for duplicates, and enrolled.
  - *Offline Blocking Case:* Given workstation is offline, When user opens Biometric Enrollment, Then UI displays "Offline: Biometric enrollment requires an active server connection", and capture button is disabled.
  - *Offline Queue Blocking Case:* Given an offline client attempts to push an enrollment payload into `PendingQueueItem`, Then queue validator rejects the item.
- **Conflicts with PRD / SRS:** None. Matches Decision O11.
- **Decision Alignment:** **Matches decision** (O11).

---

### R-023: Prohibition of Manual Attendance Correction or Override

- **Rule ID:** `R-023`
- **Rule Name:** Prohibition of Manual Attendance Correction or Override
- **Plain-Language Specification:**  
  Per **Locked Decision L12**, manual attendance correction, retroactive attendance editing, and administrative overrides are strictly forbidden. There are NO API endpoints, database fields, or UI screens for editing or manually inserting past attendance events. Flagged events (e.g. suspicious monotonic clock drift) may be viewed and acknowledged with an administrative note, but acknowledging never modifies the recorded attendance outcome.
- **Current Locations:**
  - Decision: `bcams-desktop/docs/programme/DECISIONS.md#L24` `[read]` (Locked Decision L12)
- **Required Location under L5:**  
  Enforced globally across all server APIs and client interfaces.
- **Test Specification (Given / When / Then):**
  - *No Override Endpoint:* Given an administrator attempts to send a `PUT` or `PATCH` request to modify an `AttendanceEvent` record, Then backend returns 404 Not Found (no such route exists).
  - *Review Note Acknowledgment:* Given an administrator reviews an event with `clockIntegrityStatus: 'SUSPICIOUS'`, When administrator adds an acknowledgment note, Then note is recorded in review ledger, but event status and student qualification outcome remain unchanged.
- **Conflicts with PRD / SRS:**  
  Any legacy PRD/SRS requirements suggesting manual correction are superseded by Locked Decision L12.
- **Decision Alignment:** **Matches decision** (L12).

---

## 3. Consolidated Table of Conflicts with Locked Decisions

The table below reconciles all conflicts between current code implementations (desktop and backend) and the locked architectural decisions (L1 to L16, O1 to O12). Per **Programme Rule 1**, locked decisions are not reopened; the locked decision prevails and code must be refactored to conform.

| Rule ID | Locked Decision | Code Conflict Description | File & Symbol | Prevailing Authority & Required Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **R-004** | **L11** (Staff gate 3rd scan totally ignored) | Backend writes an audit log (`STAFF_GATE_EXTRA_SCAN_IGNORED`) when a 3rd scan occurs today. L11 states 3rd scan is not recorded, not flagged, and not stored. | `bcams-be/src/modules/session-gate/gate.service.ts#L201-L210` `[read]` | **L11 Prevails.** In `C1.5`, remove audit logging of extra scans in `GateService.processGateScan`. Discard totally. |
| **R-020** | **L11** (Staff gate direction determination) | Desktop kiosk determines clock direction using naive hour heuristic (`currentHour >= 14 ? 'clock_out' : 'clock_in'`). Violates sequence determination. | `bcams-desktop/src/pages/gate/index.tsx#L72` `[read]` | **L11 Prevails.** In `C2.7`, update gate kiosk to count today's scans per staff (0 = IN, 1 = OUT, $\ge 2$ = ignore). |
| **R-005** | **L5** (Server authoritative) | Same-lecturer session closure biometric verification is implemented only in desktop mock; backend accepts session closure without verifying lecturer fingerprint. | `bcams-be/src/modules/session-gate/session.service.ts#L188-L226` `[read]` | **L5 Prevails.** In `C1.5`, add lecturer biometric probe/signed assertion verification to `SessionService.closeSession`. |
| **R-008** | **L10** (Geofence outright rejection) | Desktop client mocks geofence check via a hardcoded 1000ms `setTimeout` (distance=38m) without real coordinate validation or capture. | `bcams-desktop/src/pages/sessions/index.tsx#L216-L223` `[read]` | **L10 Prevails.** In `C2.7`, integrate real geolocation/fixed location check in desktop; server re-evaluates coordinates authoritatively. |
| **R-009** | **O5** (Clock drift threshold 5 minutes) | Backend hardcodes divergence threshold to 60 seconds (`DIVERGENCE_THRESHOLD_MS = 60 * 1000`), whereas Decision O5 mandates 5 minutes. | `bcams-be/src/modules/sync/clock-integrity.service.ts#L5` `[read]` | **O5 Prevails.** In `C1.6`, update `DIVERGENCE_THRESHOLD_MS` to $300 \times 1000$ (5 minutes). |
| **R-011** | **L15** (Session capturer capability on student) | Desktop `permissions.ts` defines `isGateCapturer` and `gate_capture` capability on Staff. L15 states there is NO gate capturer, and capturer is on Student only. Backend lacks capability model. | `bcams-desktop/src/lib/permissions.ts#L36-L38` `[read]` | **L15 Prevails.** In `C1.1` and `C2.4`, remove `gate_capture` from desktop and model `session_capture` on Student identity. |
| **R-013** | **O4** (Gate reports Super Admin only) | Backend `ReportController` allows `Role.HOD` to query staff gate reports, conflicting with Decision O4 which restricts gate reports to Super Admin only. | `bcams-be/src/modules/reports/report.controller.ts#L37-L46` `[read]` | **O4 Prevails.** In `C1.5b`, restrict all `/reports/gate` routes strictly to `Role.SUPER_ADMINISTRATOR`. |
| **R-016** | **Decision / SRS FR-2.2** (Biometric finger count) | Backend sets `MINIMUM_ENROLLMENT_COUNT = 2`, whereas SRS FR-2.2 and desktop domain types mandate 4-finger minimum for activation and 10-finger target. | `bcams-be/src/modules/identity/identity.service.ts#L19` `[read]` | **SRS FR-2.2 Prevails.** In `C1.7`, update backend `MINIMUM_ENROLLMENT_COUNT` to 4 active fingers. |

---

## 4. Test Strategy & Traceability for Phase 1 (Backend)

Every rule in this catalog maps directly to backend automated test suites to be built during Phase 1:

| Test Suite File | Rules Covered | Verification Approach |
| :--- | :--- | :--- |
| `test/domain/attendance-qualification.spec.ts` | **R-001**, **R-002**, **R-018** | Unit & service tests verifying rate calculations, tiers, policy hierarchy overrides, and suspended student rejection. |
| `test/domain/gate-rules.spec.ts` | **R-003**, **R-004**, **R-020** | Service tests verifying 09:00+60m grace, sequence-based IN/OUT, and absolute discard of 3rd same-day scan (0 DB rows, 0 audit rows). |
| `test/domain/session-lifecycle.spec.ts` | **R-005**, **R-006**, **R-007**, **R-019** | Integration tests verifying same-lecturer closure biometric match, single active session constraint, auto-expiry on max duration, and state transitions. |
| `test/domain/geofence-and-clock.spec.ts` | **R-008**, **R-009**, **R-010** | Tests verifying outright rejection of geofence violations, 5-minute clock drift flagging, reboot unverified marking, and anti-duplicate idempotency. |
| `test/domain/authorization-scoping.spec.ts` | **R-011**, **R-012**, **R-013**, **R-014**, **R-021** | Security tests verifying student capturer capability, HOD departmental boundaries, gate report Super Admin exclusivity, and lecturer course scoping. |
| `test/domain/biometrics-and-imports.spec.ts` | **R-015**, **R-016**, **R-022**, **R-023** | Integration tests verifying non-destructive student bulk import, 4-finger activation threshold, offline enrollment prohibition, and absence of manual override endpoints. |
