# BCAMS Desktop: Authorization Check & Capability Map

This document maps every authorization, role, and capability check across the `bcams-desktop` client codebase, identifying enforcement mechanisms at the route, navigation, component, API adapter, and IPC layers, and highlighting all bypass vectors.

---

## 1. Authorization Architecture & Enforcement Layers

The desktop application attempts authorization enforcement across five architectural layers:
1. **Route Guards (`RoleGuard`):** Declarative React Router route-level access control.
2. **Navigation Visibility (`Sidebar`, `CommandPalette`):** UX-level hiding/filtering of menu items.
3. **Component-Internal Checks:** Imperative checks within React page components or dialogs.
4. **API Client Adapter (`HttpApiAdapter`):** Outbound HTTP request dispatching.
5. **Electron IPC Handlers (`ipcMain.handle`):** Hardware and native OS capability execution.

---

## 2. Route Guard Layer (`src/App.tsx`)

Route guards are evaluated inside [src/App.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/App.tsx#L72-L168) using `<ProtectedRoute>` (which requires `isAuthenticated = true`) and `<RoleGuard roles={[...]} capabilities={[...]}>` ([src/components/common/role-guard.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/components/common/role-guard.tsx)).

| Route Path | Component | Guard Applied | Allowed Roles | Allowed Capabilities | Bypass Status / Vulnerability |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `LoginPage` | None (Public) | All | All | Public route. |
| `/` | `DashboardPage` | `ProtectedRoute` only | All authenticated | All | **Open to all roles.** Capturers, students, and lecturers can view administrative dashboard shell. |
| `/sessions` | `SessionsPage` | `ProtectedRoute` only | All authenticated | All | **BYPASS:** No `RoleGuard`. Any authenticated student, staff, or lecturer can navigate to the class session management screen. |
| `/sessions/:sessionId` | `SessionDetailsPage` | `ProtectedRoute` only | All authenticated | All | **BYPASS:** No `RoleGuard`. Any role can view session details and attendance rosters. |
| `/attendance` | `AttendancePage` | `ProtectedRoute` only | All authenticated | All | **BYPASS:** No `RoleGuard`. Any role can view historical attendance logs. |
| `/attendance/capture/:sessionId` | `AttendanceCapturePage` | `ProtectedRoute` only *(Internal check inside page)* | `student` *(checked inside page)* | `session_capture` | **Partial:** Route definition has no `RoleGuard`, but component internally renders `<RoleGuard capabilities={['session_capture']}>` ([capture.tsx#L182](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/attendance/capture.tsx#L182)). |
| `/gate` | `GateAttendancePage` | `ProtectedRoute` only | All authenticated | All | **BYPASS:** No `RoleGuard`. Any role (student, lecturer, HOD) can open the staff gate turnstile kiosk. |
| `/gate/records` | `GateRecordsPage` | `RoleGuard` | `super_admin` | None | **Protected.** Strict enforcement to Super Admin only. |
| `/people/students` | `StudentsPage` | `ProtectedRoute` only | All authenticated | All | **BYPASS:** No `RoleGuard`. Any role can browse student registries. |
| `/people/lecturers` | `LecturersPage` | `ProtectedRoute` only | All authenticated | All | **BYPASS:** No `RoleGuard`. Any role can browse lecturer lists. |
| `/people/staff` | `StaffPage` | `RoleGuard` | `super_admin` | None | **Protected.** |
| `/academic/enrollment` | `AcademicEnrollmentPage` | `RoleGuard` | `super_admin`, `hod` | None | **Protected.** |
| `/academic/departments` | `DepartmentsPage` | `ProtectedRoute` only | All authenticated | All | **BYPASS:** No `RoleGuard`. Any role can browse department structure. |
| `/academic/courses` | `CoursesPage` | `ProtectedRoute` only | All authenticated | All | **BYPASS:** No `RoleGuard`. Any role can browse course catalog. |
| `/enrollment` | `EnrollmentPage` | `RoleGuard` | `super_admin`, `hod` | None | **Protected.** |
| `/devices` | `DevicesPage` | `RoleGuard` | `super_admin` | None | **Protected.** |
| `/policies` | `PoliciesPage` | `RoleGuard` | `super_admin` | None | **Protected.** |
| `/reports` | `ReportsPage` | `RoleGuard` | `super_admin`, `hod`, `lecturer` | None | **Protected.** |
| `/audit` | `AuditPage` | `RoleGuard` | `super_admin` | None | **Protected.** |

---

## 3. Navigation Visibility Layer (`Sidebar` & `CommandPalette`)

Navigation visibility is a **UX-convenience mechanism, NOT a security boundary**. Bypassing it requires only typing the URL in the browser bar or executing `navigate('/path')` in DevTools.

### 3.1 Sidebar ([src/components/layout/sidebar.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/components/layout/sidebar.tsx#L29-L140))
- **Dashboard (`/`):** Visible if `isSuperAdmin(user) || isHOD(user) || isLecturer(user)`.
- **Sessions (`/sessions`):** Visible if `isSuperAdmin(user) || isHOD(user) || isLecturer(user) || isSessionCapturer(user)`.
- **Attendance (`/attendance`):** Visible if `isSuperAdmin(user) || isHOD(user) || isLecturer(user)`.
- **Gate Terminal (`/gate`):** Visible if `isGateCapturer(user)`.
- **Gate Records (`/gate/records`):** Visible exclusively if `isSuperAdmin(user)`.
- **Students (`/people/students`):** Visible if `canManageStudents(user)` (`super_admin` or `hod`).
- **Academic Enrollment (`/academic/enrollment`):** Visible if `canManageAcademicEnrollment(user)`.
- **Lecturers (`/people/lecturers`):** Visible if `isSuperAdmin(user) || isHOD(user)`.
- **Staff Registry (`/people/staff`):** Visible exclusively if `isSuperAdmin(user)`.
- **Biometric Enrollment (`/enrollment`):** Visible if `canManageBiometrics(user)`.
- **Departments (`/academic/departments`):** Visible if `isSuperAdmin(user) || isHOD(user)`.
- **Courses (`/academic/courses`):** Visible if `isSuperAdmin(user) || isHOD(user) || isLecturer(user)`.
- **Trusted Devices (`/devices`):** Visible exclusively if `canManageDevices(user)` (`super_admin`).
- **Policies (`/policies`):** Visible exclusively if `canManagePolicies(user)` (`super_admin`).
- **Reports (`/reports`):** Visible if `canViewReports(user)`.
- **Audit Log (`/audit`):** Visible exclusively if `canViewAuditLog(user)` (`super_admin`).

### 3.2 Command Palette ([src/components/common/command-palette.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/components/common/command-palette.tsx#L41-L77))
- Filters commands using `item.roles.includes(user.role)`.
- Notice: Does **not** check capabilities (`session_capture` or `gate_capture`). For example, item `nav-gate` specifies `roles: ['super_admin', 'staff']` ([command-palette.tsx#L46](file:///Users/mac/Documents/projects/bcams-desktop/src/components/common/command-palette.tsx#L46)), permitting any regular staff member without `gate_capture` capability to trigger navigation to `/gate`!

---

## 4. Component-Internal Checks Layer

| Page / Component | Symbol / Location | Check Performed | Enforced Outcome |
| :--- | :--- | :--- | :--- |
| `AttendanceCapturePage` | [src/pages/attendance/capture.tsx#L180-L186](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/attendance/capture.tsx#L180-L186) | `!isSessionCapturer(user)` | Renders `<RoleGuard capabilities={['session_capture']}>` if false. |
| `SessionsPage` | [src/pages/sessions/index.tsx#L125](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/sessions/index.tsx#L125) | `isSessionCapturer(user)` | Conditionally renders "Start New Class Session" activation button. |
| `StudentsPage` | [src/pages/people/students.tsx#L105](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/people/students.tsx#L105) | `canManageStudents(user, deptId)` | Conditionally hides/shows "Register Student" and "Bulk Import" buttons. |
| `CoursesPage` | [src/pages/academic/courses.tsx#L55](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/academic/courses.tsx#L55) | `isSuperAdmin(user) \|\| isHOD(user)` | Conditionally renders "Add Course" button. |
| `DepartmentsPage` | [src/pages/academic/departments.tsx#L45](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/academic/departments.tsx#L45) | `isSuperAdmin(user)` | Conditionally renders "Add Department" button. |
| `GateRecordsPage` | [src/pages/gate/records.tsx#L151](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/gate/records.tsx#L151) | `isSuperAdmin(user)` | Conditionally renders Export Ledger dialog button. |

---

## 5. Client API Adapter Layer (`src/api/http-adapter.ts`)

| Enforcement Dimension | Status in Code | Finding / Vulnerability |
| :--- | :--- | :--- |
| **Role Validation Before Dispatch** | **ABSENT** | `HttpApiAdapter` contains zero checks on `user.role` or `user.captureCapability`. Any method can be called by any renderer script if a token exists. |
| **Capability Scope Injection** | **ABSENT** | No role or capability claims are embedded in request bodies or custom headers (only static `X-Client-Platform: bcams-desktop`). |
| **Token Handling** | Implemented | Appends `Authorization: Bearer <token>` when present ([http-adapter.ts#L84](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L84)). |

---

## 6. Electron IPC Layer (`electron/main.js`)

The Electron main process constitutes the **ultimate security boundary** for desktop hardware access, OS filesystem, and window management.

| IPC Channel | Action | Role / Capability Checked | Sender / Frame Validated? | Security Verdict |
| :--- | :--- | :--- | :--- | :--- |
| `app:getVersion` | Returns app version | **NONE** | **NO** | Safe / Public |
| `app:getPlatform` | Returns OS platform | **NONE** | **NO** | Safe / Public |
| `app:getSystemTime` | Hardware wallClock & monotonic nanoseconds | **NONE** | **NO** | Safe (Timing telemetry) |
| `window:minimize` | Minimizes main window | **NONE** | **NO** | Window management |
| `window:maximize` | Toggles window maximize | **NONE** | **NO** | Window management |
| `window:close` | Closes app window | **NONE** | **NO** | Window management |
| `scanner:getStatus` | Hardware connection & transport state | **NONE** | **NO** | Telemetry read |
| `scanner:connect` | Sets connected state | **NONE** | **NO** | **UNGUARDED:** Any script can alter scanner state. |
| `scanner:disconnect` | Disconnects scanner | **NONE** | **NO** | **UNGUARDED:** Any script can force disconnect. |
| `scanner:setTransport` | Changes transport to USB/Bluetooth | **NONE** | **NO** | Input checked against enum; sender unvalidated. |
| `scanner:cancelCapture` | Aborts ongoing capture | **NONE** | **NO** | **UNGUARDED** |
| `scanner:startCapture` | **Triggers biometric sensor exposure & matching** | **NONE** | **NO** | **CRITICAL BYPASS:** Any webpage, iframe, or renderer component can trigger hardware fingerprint scanning and local candidate resolution without authenticating role or session capturer capability! |
| `device:getInfo` | Returns hardware telemetry (CPU, memory, OS) | **NONE** | **NO** | Telemetry read |

---

## 7. Critical Bypass Vectors Summary

1. **Direct Route Navigation to Kiosk & Data Pages:**
   Because `/gate`, `/sessions`, `/attendance`, `/people/students`, `/people/lecturers`, `/academic/departments`, and `/academic/courses` lack route-level `<RoleGuard>` wrappers in [src/App.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/App.tsx), any authenticated user who manually inputs the hash route (e.g. `/#/gate` or `/#/people/students`) can access these pages, bypassing the Sidebar's visibility filters entirely.
2. **Unguarded Hardware IPC Channels:**
   The Electron main process has zero awareness of application-level authentication. A compromised renderer context or an injected third-party dependency can trigger `window.bcamsBridge.scanner.startCapture()` at will.
3. **Command Palette Role Misalignment:**
   `CommandPalette` does not check capability flags (`session_capture`, `gate_capture`). Regular staff members are presented with the `/gate` navigation command despite lacking gate capturer authorization.
