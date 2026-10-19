# BCAMS Backend Data Model & Schema Assessment

**Document Version:** 1.0.0  
**Date of Snapshot:** October 19, 2026  
**ORM:** Prisma 5.10.0 / 5.22.0 Client (`@prisma/client`)  
**Schema Path:** `bcams-be/prisma/schema.prisma`  
**Evidence Standard:** All claims tagged `[read]`, `[inferred]`, or `[unverified]`.

---

## 1. Schema Overview

The schema models an educational attendance domain centered around a base `Person` entity specialized into `Student`, `Lecturer`, and `Staff` roles.
- **Total Models:** 18 `[read]`
- **Total Enums:** 10 `[read]`
- **Relations Structure:** Relational integrity enforced via PostgreSQL foreign keys with `@relation` directives.

---

## 2. Enum Inventory

| Enum Name | Values | Context / SRS Tracing |
| :--- | :--- | :--- |
| `EnrollmentType` | `CORE`, `ELECTIVE`, `CARRYOVER`, `GENERAL` | Academic course registration category. |
| `SessionStatus` | `DRAFT`, `AUTHORIZED`, `ACTIVE`, `CLOSED`, `EXPIRED` | Class session lifecycle state machine (FR-9.1). |
| `ClockEventType` | `IN`, `OUT` | Staff gate attendance direction (FR-13.1, FR-13.2). |
| `PunctualityClassification` | `ON_TIME`, `LATE` | Computed punctuality tier (FR-14.2). |
| `ClockIntegrityStatus` | `VERIFIED`, `SUSPICIOUS`, `UNVERIFIED` | Monotonic clock protection status (FR-4). |
| `DevicePlatform` | `MOBILE_ANDROID`, `DESKTOP_WINDOWS` | Physical hardware platform (FR-1.1). |
| `DeviceStatus` | `REGISTERED`, `ACTIVE`, `SUSPENDED`, `REVOKED`, `RETIRED` | Endpoint device operational lifecycle (FR-1.2). |
| `EnrollmentStatus` | `ACTIVE`, `SUPERSEDED`, `FLAGGED_DUPLICATE` | Fingerprint template record state (FR-2.2, FR-2.3). |
| `PolicyType` | `ATTENDANCE_THRESHOLD`, `PUNCTUALITY_HOURS`, `GEOFENCE_RADIUS` | Operational rule category (FR-11.2, FR-14.1). |
| `PolicyScope` | `INSTITUTION`, `DEPARTMENT`, `COURSE` | Hierarchical policy application level. |

---

## 3. Complete Model Catalog

### 3.1 `Person` (Architecture §6 Base Entity)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `firstName` | `String` | Required | |
| `lastName` | `String` | Required | |
| `email` | `String?` | Optional, `@unique` | Unique email index |
| `phone` | `String?` | Optional | |
| `gender` | `String?` | Optional | |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Relations:* 1:1 with `Student?`, `Lecturer?`, `Staff?`; 1:N with `BiometricEnrollment[]`, `AuditLogEntry[]` `[read]`.

### 3.2 `Department`
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `code` | `String` | Required, `@unique` | Unique departmental code |
| `name` | `String` | Required | |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Relations:* 1:N with `Student[]`, `Lecturer[]`, `Staff[]`, `Course[]` `[read]`.

### 3.3 `Student` (SRS §8, FR-8.1)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `personId` | `String` | Required, `@unique` | FK -> `Person.id` (Cascade delete) |
| `matricNumber` | `String` | Required, `@unique` | Unique institutional matric number |
| `departmentId` | `String` | Required | FK -> `Department.id` |
| `level` | `Int` | Required | Academic level (e.g. 100, 200, 300) |
| `status` | `String` | `@default("ACTIVE")` | |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Relations:* 1:N with `Enrollment[]`, `AttendanceEvent[]` `[read]`.

### 3.4 `Lecturer` (SRS §8, FR-8.2)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `personId` | `String` | Required, `@unique` | FK -> `Person.id` (Cascade delete) |
| `staffNumber` | `String` | Required, `@unique` | Unique staff identifier |
| `departmentId` | `String` | Required | FK -> `Department.id` |
| `title` | `String?` | Optional | e.g. Dr., Prof. |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Relations:* 1:N with `LecturerAssignment[]`, `Session[]` (`ConductingLecturer`), `Session[]` (`SubstituteLecturer`) `[read]`.

### 3.5 `Staff` (SRS §8, FR-12.1)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `personId` | `String` | Required, `@unique` | FK -> `Person.id` (Cascade delete) |
| `staffNumber` | `String` | Required, `@unique` | Unique staff identifier |
| `departmentId` | `String?` | Optional | Nullable for institution-wide staff |
| `staffType` | `String` | `@default("NON_TEACHING")` | `TEACHING` or `NON_TEACHING` |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Relations:* 1:1 with `StaffRecord?`, 1:N with `ClockEvent[]` `[read]`.

### 3.6 `Course`
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `code` | `String` | Required, `@unique` | e.g. "CSC301" |
| `title` | `String` | Required | |
| `unit` | `Int` | Required | Credit units |
| `departmentId` | `String` | Required | FK -> `Department.id` |
| `isGeneral` | `Boolean` | `@default(false)` | Institutional general course flag |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Relations:* 1:N with `CourseOffering[]`, `LecturerAssignment[]` `[read]`.

### 3.7 `CourseOffering`
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `courseId` | `String` | Required | FK -> `Course.id` |
| `academicSession` | `String` | Required | e.g. "2026/2027" |
| `semester` | `String` | Required | e.g. "FIRST" |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Constraints:* `@@unique([courseId, academicSession, semester])` `[read]`.  
*Relations:* 1:N with `Enrollment[]`, `Session[]` `[read]`.

### 3.8 `Enrollment` (Course Enrollment)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `studentId` | `String` | Required | FK -> `Student.id` |
| `courseOfferingId` | `String` | Required | FK -> `CourseOffering.id` |
| `type` | `EnrollmentType` | `@default(CORE)` | Enum |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Constraints:* `@@unique([studentId, courseOfferingId])` `[read]`.

### 3.9 `LecturerAssignment`
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `lecturerId` | `String` | Required | FK -> `Lecturer.id` |
| `courseId` | `String` | Required | FK -> `Course.id` |
| `academicSession` | `String` | Required | |
| `semester` | `String` | Required | |
| `isPrimary` | `Boolean` | `@default(true)` | |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Constraints:* `@@unique([lecturerId, courseId, academicSession, semester])` `[read]`.

### 3.10 `Session` (Class Session, FR-9)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `courseOfferingId` | `String` | Required | FK -> `CourseOffering.id` |
| `conductingLecturerId` | `String` | Required | FK -> `Lecturer.id` |
| `substituteLecturerId` | `String?` | Optional | FK -> `Lecturer.id` |
| `status` | `SessionStatus` | `@default(DRAFT)` | Lifecycle enum |
| `scheduledStartTime` | `DateTime?` | Optional | |
| `scheduledEndTime` | `DateTime?` | Optional | |
| `actualStartTime` | `DateTime?` | Optional | Set upon authorization |
| `actualEndTime` | `DateTime?` | Optional | Set upon closure |
| `approvedLatitude` | `Float` | Required | Geofence center lat |
| `approvedLongitude` | `Float` | Required | Geofence center lng |
| `geofenceRadiusMeters` | `Float` | `@default(200.0)` | Boundary radius |
| `createdById` | `String?` | Optional | Acting person ID |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Relations:* 1:N with `AttendanceEvent[]` `[read]`.

### 3.11 `AttendanceEvent` (FR-10, Append-Only)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `eventId` | `String` | Required, `@unique` | Client sync idempotency UUID |
| `sessionId` | `String` | Required | FK -> `Session.id` |
| `studentId` | `String` | Required | FK -> `Student.id` |
| `deviceId` | `String` | Required | FK -> `Device.id` |
| `timestamp` | `DateTime` | Required | Event capture timestamp |
| `capturedLatitude` | `Float?` | Optional | GPS latitude at capture |
| `capturedLongitude` | `Float?` | Optional | GPS longitude at capture |
| `signature` | `String` | Required | Event signature |
| `clockIntegrityStatus`| `ClockIntegrityStatus` | `@default(VERIFIED)`| Verification flag |
| `createdAt` | `DateTime` | `@default(now())` | Record ingestion timestamp |
*Constraints:* `@@unique([sessionId, studentId])` (Prevents duplicate session events per student) `[read]`.

### 3.12 `StaffRecord`
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `staffId` | `String` | Required, `@unique` | FK -> `Staff.id` |
| `employmentDate` | `DateTime?` | Optional | |
| `status` | `String` | `@default("ACTIVE")` | |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

### 3.13 `ClockEvent` (Staff Gate Attendance, FR-13, Append-Only)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `eventId` | `String` | Required, `@unique` | Client sync idempotency UUID |
| `staffId` | `String` | Required | FK -> `Staff.id` |
| `type` | `ClockEventType`| Required | `IN` or `OUT` |
| `timestamp` | `DateTime` | Required | Event capture timestamp |
| `deviceId` | `String` | Required | FK -> `Device.id` |
| `signature` | `String` | Required | Event signature |
| `punctuality` | `PunctualityClassification` | `@default(ON_TIME)` | Evaluated against policy |
| `clockIntegrityStatus`| `ClockIntegrityStatus` | `@default(VERIFIED)`| Verification flag |
| `createdAt` | `DateTime` | `@default(now())` | Record ingestion timestamp |

### 3.14 `Device` (FR-1)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `deviceId` | `String` | Required, `@unique` | Hardware/UUID identifier |
| `name` | `String` | Required | Friendly device name |
| `platform` | `DevicePlatform` | Required | OS/Hardware platform |
| `status` | `DeviceStatus` | `@default(REGISTERED)` | Operational lifecycle |
| `assignedScope` | `String?` | Optional | Location/Dept binding |
| `credentialHash`| `String?` | Optional | SHA-256 pre-shared secret |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |
*Relations:* 1:N with `AttendanceEvent[]`, `ClockEvent[]`, `CalibrationPair[]`, `AuditLogEntry[]` `[read]`.

### 3.15 `BiometricEnrollment` (FR-2)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `personId` | `String` | Required | FK -> `Person.id` |
| `fingerIndex` | `Int` | Required | Finger index (0–9) |
| `templateHash`| `String` | Required | Opaque template hash |
| `status` | `EnrollmentStatus` | `@default(ACTIVE)` | `ACTIVE`, `SUPERSEDED`, `FLAGGED_DUPLICATE` |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

### 3.16 `CalibrationPair` (FR-4.1)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `deviceId` | `String` | Required | FK -> `Device.id` |
| `serverTime` | `DateTime` | Required | Authenticated server timestamp |
| `deviceMonotonicTimeMs` | `BigInt` | Required | Monotonic clock millisecond value |
| `createdAt` | `DateTime` | `@default(now())` | |

### 3.17 `AuditLogEntry` (FR-5, Append-Only)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `action` | `String` | Required | Action verb |
| `actorPersonId` | `String?` | Optional | FK -> `Person.id` |
| `actorDeviceId` | `String?` | Optional | FK -> `Device.id` |
| `details` | `Json?` | Optional | Structured event payload |
| `ipAddress` | `String?` | Optional | Client IP |
| `createdAt` | `DateTime` | `@default(now())` | Immutable entry timestamp |

### 3.18 `Policy` (FR-11.2, FR-14.1)
| Field | Type | Attributes | Relations / Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(uuid())` | Primary Key |
| `type` | `PolicyType` | Required | Rule type |
| `scopeLevel` | `PolicyScope` | `@default(INSTITUTION)` | Institution, Department, or Course |
| `scopeId` | `String?` | Optional | Target department or course ID |
| `config` | `Json` | Required | Policy thresholds / hours |
| `effectiveFrom` | `DateTime` | Required | Effective timestamp |
| `version` | `Int` | `@default(1)` | Version increment |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

---

## 4. Migration History & Database Runtime Check

### 4.1 Migration Folder Analysis
1. `20260916122120_init_increment_0` `[read]`:
   - Contains a valid, comprehensive `migration.sql` (406 lines) creating all 18 tables, 10 enums, foreign keys, and indexes.
2. `20260921060000_concurrency_partial_indexes` `[read]`:
   - **Defect:** Empty directory (0 files). Does not contain `migration.sql`. Represents a botched or interrupted migration attempt.

### 4.2 Local Database Application Verification
- **PostgreSQL Availability:** Neither PostgreSQL daemon nor command-line utilities (`psql`, `docker`, `brew`) are available on this developer workstation `[read]`.
- **Prisma Engine Runtime Block:** Executing Prisma database migrations or Prisma Client initialization on macOS triggers `PrismaClientInitializationError`: `library load disallowed by system policy` for `libquery_engine-darwin.dylib.node` `[read]`.
- **Verdict:** Migrations cannot be applied locally until Prisma engine binaries are properly code-signed or executed in a containerized Linux environment in Phase 1 (`C1.0`).
