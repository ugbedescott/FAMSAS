# BCAMS Domain Model Diff: Desktop Types vs Prisma Schema (C0.3)

**Document Version:** 1.0.0  
**Baseline Date:** October 19, 2026  
**Artifacts Compared:**  
- Desktop TypeScript Domain Model: [bcams-desktop/src/types/domain.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/types/domain.ts)  
- Backend Prisma ORM Schema: [bcams-be/prisma/schema.prisma](file:///Users/mac/Documents/projects/bcams-be/prisma/schema.prisma)  
**Evidence Standard:** Tagged `[read]` (direct source inspection) or `[inferred]`.

---

## 1. Domain Architecture Summary

The domain models across `bcams-desktop` and `bcams-be` share the same foundational philosophy (Architecture §6: Base `Person` entity specialized into `Student`, `Lecturer`, and `Staff`), but exhibit significant structural drift, field renaming, conceptual duplication, and missing tables.

```
Domain Model Comparison:
├── Entities Matched with Discrepancies: 11 models
├── Models Completely Missing in Backend:  2 models (AcademicEnrollment, DailyClockRecord)
├── Models Completely Missing in Frontend: 3 models (PolicyRule, DeviceKey, UserAccount)
└── Core Concept Conflicts:               4 major structural divergences
```

---

## 2. Core Conceptual Conflicts & Duplications

### 2.1 Session State vs Session Status
- **Desktop Concept:** `Session.state` ([src/types/domain.ts#L196](file:///Users/mac/Documents/projects/bcams-desktop/src/types/domain.ts#L196)):
  `export type SessionState = 'draft' | 'authorized' | 'active' | 'closed' | 'expired';` (Lowercase string union).
- **Backend Concept:** `Session.status` ([schema.prisma#L27](file:///Users/mac/Documents/projects/bcams-be/prisma/schema.prisma#L27)):
  `enum SessionStatus { DRAFT, AUTHORIZED, ACTIVE, CLOSED, EXPIRED }` (Uppercase DB enum).
- **Impact:** Frontend and backend cannot directly serialize/deserialize Session records without translation.

### 2.2 Same-Lecturer Session Closure Authority (Rule 21)
- **Desktop Implementation:** [src/types/domain.ts#L215](file:///Users/mac/Documents/projects/bcams-desktop/src/types/domain.ts#L215) explicitly defines:
  `closureAuthorizedByLecturerId?: string;`
  Enforcing that only the biometric verification of the *same* lecturer who authorized the session start can close it.
- **Backend Implementation:** [schema.prisma#L235](file:///Users/mac/Documents/projects/bcams-be/prisma/schema.prisma#L235) has no closure authorizer field. Any user or any lecturer can close an active session without biometric verification.

### 2.3 Permanent Identity vs Time-Dependent Academic Enrollment
- **Desktop Model:** Separates permanent student identity ([Student](file:///Users/mac/Documents/projects/bcams-desktop/src/types/domain.ts#L56)) from time-bound session progression ([AcademicEnrollment](file:///Users/mac/Documents/projects/bcams-desktop/src/types/domain.ts#L78)).
- **Backend Model:** Merges current level directly into `Student.level` ([schema.prisma#L69](file:///Users/mac/Documents/projects/bcams-be/prisma/schema.prisma#L69)). There is no `AcademicEnrollment` table in Prisma to record student semester progression, session repeating, or level advancement history.

### 2.4 Staff Gate Turnstile Scans vs Extra Scan Policy (L11)
- **Desktop Model:** [DailyClockRecord](file:///Users/mac/Documents/projects/bcams-desktop/src/types/domain.ts#L263-L271) contains an `additionalScans: number` counter, representing extra same-day scans beyond clock-in and clock-out.
- **Backend Model:** Stores discrete `ClockEvent` rows with `direction: IN | OUT`. When a 3rd scan occurs, the backend logs an audit event (`STAFF_GATE_EXTRA_SCAN_IGNORED`).
- **Conflict with Decision L11:** Locked Decision L11 dictates that a third scan is **ignored totally: not recorded, not flagged, and not stored**. Storing `additionalScans` or generating audit logs directly violates L11.

---

## 3. Entity-by-Entity Detailed Comparison Table

| Entity | Desktop Type (`domain.ts`) | Prisma Model (`schema.prisma`) | Renamed Fields | Missing in Desktop | Missing in Prisma | Derived Values Stored as Columns |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **User & Account** | `User` (role, capability, tokens) | *None* (No User/Account model) | N/A | Password hashes, invitation tokens, MFA seeds | Entire `User` model missing in Prisma | None |
| **Person** | `Person` | `Person` | `fullName` vs `firstName` + `lastName` | `phone`, `gender` | `fullName`, `specializations[]`, `departmentName`, `biometricStatus`, `enrolledFingers` | `biometricStatus`, `enrolledFingers` |
| **Student** | `Student` | `Student` | `status` vs `status` (String) | `createdAt`, `updatedAt` | `contactEmail`, `contactPhone`, `currentProgramme`, `currentSession`, `programme`, `academicSession`, `courseEnrollments[]`, `captureCapability` | `currentLevel`, `currentSession` (duplicates) |
| **Lecturer** | `Lecturer` | `Lecturer` | `staffId` vs `staffNumber`<br>`designation` vs `title` | `staffNumber`, `departmentId` | `fullName`, `staffPersonId`, `designation`, `contactEmail`, `contactPhone`, `assignedCourses[]` | `assignedCourses[]` |
| **Staff** | `Staff` | `Staff` | `staffId` vs `staffNumber`<br>`staffType` ('academic' vs 'TEACHING') | `staffNumber`, `departmentId` | `fullName`, `designation`, `isLecturer`, `contactEmail`, `contactPhone`, `captureCapability` | None |
| **Department** | `Department` | `Department` | None | `createdAt`, `updatedAt` | `faculty`, `hodId`, `hodName`, `studentCount`, `lecturerCount`, `staffCount`, `courseCount` | `studentCount`, `lecturerCount`, `staffCount`, `courseCount` |
| **Course** | `Course` | `Course` | None | None | `departmentName` | None |
| **Course Offering** | `CourseOffering` | `CourseOffering` | `approvedLocation` vs `approvedLatitude` + `approvedLongitude` | `approvedLatitude`, `approvedLongitude` | `courseCode`, `courseTitle`, `departmentName`, `primaryLecturerName`, `assignedLecturers[]`, `enrolledStudents` | `enrolledStudents` |
| **Course Enrollment** | `CourseEnrollment` | `Enrollment` | `type` vs `enrollmentType`<br>`enrolledAt` vs `registeredAt` | `status` | `courseCode`, `courseTitle` | None |
| **Academic Enrollment** | `AcademicEnrollment` | *None* | N/A | Entire Model | N/A | None |
| **Class Session** | `Session` | `Session` | `state` vs `status`<br>`maxDurationMinutes` vs `scheduledDurationMinutes`<br>`location` vs `venueCoordinates` | `qualificationRate` | `courseCode`, `courseTitle`, `departmentId`, `createdById`, `createdByName`, `lecturerName`, `authorizationType`, `substituteLecturerName`, `closureAuthorizedByLecturerId`, `location` | `attendanceCount`, `enrolledCount` |
| **Attendance Event** | `AttendanceEvent` | `AttendanceEvent` | `timestamp` vs `capturedAt` | `monotonicOffsetMs`, `probeTemplateHash`, `deviceSignature`, `capturedLatitude`, `capturedLongitude`, `distanceMeters`, `geofenceValid` | `studentName`, `matricNumber`, `syncStatus`, `syncedAt` | None |
| **Gate Clock Event** | `ClockEvent` | `ClockEvent` | `type` ('clock_in'/'clock_out') vs `direction` ('IN'/'OUT')<br>`punctuality` ('on-time'/'late' vs 'ON_TIME'/'LATE') | `direction` | `staffName`, `staffDepartment`, `syncStatus`, `syncedAt` | None |
| **Daily Clock Record** | `DailyClockRecord` | *None* | N/A | Entire Model | N/A | `additionalScans`, `clockIn`, `clockOut` |
| **Biometric Profile** | `FingerEnrollment` | `BiometricEnrollment` | `position` ('left_thumb' string) vs `fingerIndex` (Int 0–9)<br>`quality` vs `nfiqScore` | `templateHash`, `status` | `position`, `enrolled` | None |
| **Device / Terminal** | `Device` | `Device` | `serialNumber` vs `deviceSerial` | `sharedSecret`, `boundScannerSerial`, `revokedAt`, `suspendedAt` | `name`, `type`, `lifecycleState`, `hardwareFingerprint`, `assignedLocation`, `assignedScope`, `activatedAt`, `lastSyncAt`, `hostname`, `pendingEvents`, `scannerTransport`, `scannerModel`, `scannerConnected` | `pendingEvents`, `scannerConnected` |
| **Policy** | `Policy` | `Policy` + `PolicyRule` | Normalized into 2 tables in Prisma | Relational `PolicyRule[]` table | Flat `value` union, `scopeName`, `createdBy`, `isActive` | None |
| **Audit Log** | `AuditEntry` | `AuditLogEntry` | `action` vs `eventType`<br>`resource` vs `entityType`<br>`details` vs `payload` | `actorPersonId`, `actorDeviceId`, `previousHash` (L6 gap) | `userName`, `userRole`, `resourceId`, `deviceId` | None |

---

## 4. Renamed Fields Master Catalog

| Entity | Desktop Field Name | Prisma Field Name | Type in Desktop | Type in Prisma | Mapping / Serialization Rule |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Student` | `matricNumber` | `matricNumber` | `string` | `String` (@unique) | Compatible |
| `Lecturer` | `staffId` | `staffNumber` | `string` | `String` (@unique) | `dto.staffNumber = desktop.staffId` |
| `Lecturer` | `designation` | `title` | `string` | `String?` | `dto.title = desktop.designation` |
| `Staff` | `staffId` | `staffNumber` | `string` | `String` (@unique) | `dto.staffNumber = desktop.staffId` |
| `Staff` | `staffType` | `staffType` | `'academic' \| 'non_academic'` | `String` (`TEACHING` \| `NON_TEACHING`) | Map `'academic' -> 'TEACHING'`, `'non_academic' -> 'NON_TEACHING'` |
| `Session` | `state` | `status` | `'draft' \| 'authorized' \| 'active' \| 'closed' \| 'expired'` | `SessionStatus` (`DRAFT`, `AUTHORIZED`, `ACTIVE`, `CLOSED`, `EXPIRED`) | `dto.status = desktop.state.toUpperCase()` |
| `Session` | `maxDurationMinutes` | `scheduledDurationMinutes` | `number` | `Int` (@default(120)) | `dto.scheduledDurationMinutes = desktop.maxDurationMinutes` |
| `AttendanceEvent` | `timestamp` | `capturedAt` | `string` (ISO 8601) | `DateTime` | `dto.capturedAt = new Date(desktop.timestamp)` |
| `CourseOffering` | `approvedLocation` | `approvedLatitude`, `approvedLongitude` | `{ latitude: number, longitude: number }` | `Float`, `Float` | Flatten object to `lat`/`lng` columns |
| `CourseEnrollment` | `type` | `enrollmentType` | `'core' \| 'elective' \| 'carryover' \| 'general'` | `EnrollmentType` (`CORE`, `ELECTIVE`, `CARRYOVER`, `GENERAL`) | `dto.enrollmentType = desktop.type.toUpperCase()` |
| `ClockEvent` | `type` | `direction` | `'clock_in' \| 'clock_out'` | `ClockEventType` (`IN`, `OUT`) | Map `'clock_in' -> 'IN'`, `'clock_out' -> 'OUT'` |
| `ClockEvent` | `punctuality` | `punctuality` | `'on-time' \| 'late'` | `PunctualityClassification` (`ON_TIME`, `LATE`) | Map `'on-time' -> 'ON_TIME'`, `'late' -> 'LATE'` |
| `BiometricProfile` | `position` | `fingerIndex` | `FingerPosition` (10 strings) | `Int` (0–9) | Map enum strings to 0–9 integer indices |
| `BiometricProfile` | `quality` | `nfiqScore` | `number` (0–100) | `Int` (1–100 NFIQ score) | Compatible |
| `AuditEntry` | `action` | `eventType` | `string` (lowercase action) | `String` (uppercase event) | Map to uppercase domain action |

---

## 5. Business Keys vs Foreign Keys Inventory

| Model | Business Key | Implemented Foreign Key in Prisma | Issue / Integrity Risk |
| :--- | :--- | :--- | :--- |
| `Student` | `matricNumber` | `personId` (FK -> `Person.id`) | Relational integrity is sound via `personId`. Desktop APIs frequently pass `matricNumber` directly instead of UUID. |
| `Lecturer` | `staffNumber` | `personId` (FK -> `Person.id`) | Relational integrity sound. Desktop uses `staffId` as an arbitrary business key. |
| `CourseOffering` | `academicSession` + `courseId` + `semester` | `courseId` (FK -> `Course.id`), `primaryLecturerId` (FK -> `Lecturer.id`) | Unique constraint missing in Prisma: a course can be scheduled multiple times for the same session and semester without collision detection. |
| `Enrollment` | `studentId` + `courseOfferingId` | `studentId` (FK -> `Student.id`), `courseOfferingId` (FK -> `CourseOffering.id`) | Correctly indexed with `@@unique([studentId, courseOfferingId])`. |
| `AttendanceEvent` | `sessionId` + `studentId` | `sessionId`, `studentId`, `deviceId` | Prisma defines `@@unique([sessionId, studentId])`, correctly blocking duplicate attendance records at database level. |
| `ClockEvent` | `staffId` + `date` + `direction` | `staffId` (FK -> `Staff.id`), `deviceId` (FK -> `Device.id`) | Missing unique constraint in Prisma: multiple `IN` or `OUT` scans on the same day can be inserted if not guarded at service layer. |

---

## 6. Derived Values Stored as Database Columns

Storing derived counts in database columns introduces data synchronization drift and race conditions under concurrent sync ingestion:

1. **`Session.attendanceCount` & `Session.qualificationRate`:** Stored directly in `Session` table ([schema.prisma#L243-L244](file:///Users/mac/Documents/projects/bcams-be/prisma/schema.prisma#L243-L244)). Should be dynamically computed via `COUNT(AttendanceEvent)` to prevent drift during batch sync replays.
2. **`Department.studentCount`, `lecturerCount`, `courseCount`:** Stored in desktop `Department` interface ([src/types/domain.ts#L127-L130](file:///Users/mac/Documents/projects/bcams-desktop/src/types/domain.ts#L127-L130)). Excluded from Prisma (correctly calculated on the fly).
3. **`CourseOffering.enrolledStudents`:** Stored as an integer in desktop ([src/types/domain.ts#L161](file:///Users/mac/Documents/projects/bcams-desktop/src/types/domain.ts#L161)). Excluded from Prisma (derived from `Enrollment.count`).
