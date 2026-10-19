# BCAMS Desktop: Targeted Follow-Up Discovery & Technical Audit (C0.2)

This document provides exhaustive, code-grounded answers to the 25 follow-up discovery questions regarding `bcams-desktop` (Electron, React, TypeScript), resolving gaps in the 15 October 2026 As-Built Report (`BCAMS_CURRENT_STATE_REPORT.md`).

---

## 1. Questions & Code Evidence

### Question 1: Fingerprint Matching & Biometric Data
- **File Paths:**
  - Renderer: [src/services/scanner-service.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/services/scanner-service.ts#L48-L57)
  - Main Process: [electron/main.js](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js#L74-L81)
  - UI Consumer: [src/pages/attendance/capture.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/attendance/capture.tsx#L103)
  - UI Consumer: [src/pages/gate/index.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/gate/index.tsx#L66)
- **Symbols:** `scannerService.mockResults`, `biometricRoster`, `scanner:startCapture`, `handleCapture`
- **Evidence Tag:** `[read]`
- **Verdict:** `mocked`
- **Detailed Finding:**
  Fingerprint matching today does not perform actual biometric minutiae comparison, ISO/IEC 19794-2 template matching, or ANSI 378 extraction.
  1. In the renderer process, [src/services/scanner-service.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/services/scanner-service.ts#L48-L57) defines a static cycling array `mockResults` returning canned objects (`stu-001`, `stu-002`, `stu-005`, `duplicate`, `stu-006`, `no_match`).
  2. In the Electron main process, [electron/main.js](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js#L74-L81) defines an in-memory array `biometricRoster` of 6 synthetic candidates (`stu-001` through `stu-008`). During IPC `scanner:startCapture` ([electron/main.js:L150-L204](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js#L150-L204)), it delays 850ms (`setTimeout`) and modulo-indexes the roster (`candidate = biometricRoster[captureSequence % biometricRoster.length]`). Every 7th scan is hardcoded to return `no_match`.
  3. No raw image data, minutiae points, or biometric templates are transferred or processed.

---

### Question 2: Queued Offline Event Fields & Local Biometric Storage
- **File Paths:**
  - Store Interface: [src/stores/sync-store.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L12-L20)
  - Queue Service: [src/services/offline-queue-service.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L38-L44)
  - Capture Invocation: [src/pages/attendance/capture.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/attendance/capture.tsx#L135-L139)
- **Symbols:** `PendingQueueItem`, `offlineQueue.enqueueItem`, `useSyncStore.addPendingItem`
- **Evidence Tag:** `[read]`
- **Verdict:** `partial`
- **Detailed Finding:**
  The offline queue item data structure [PendingQueueItem](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L12-L20) stores exactly seven fields:
  ```typescript
  export interface PendingQueueItem {
    id: string;                         // Generated: 'evt-pend-' + Math.random().toString(36)...
    type: 'attendance' | 'clock' | 'session' | 'system';
    description: string;                // e.g. "Oluwaseun Adeyemi — CSC 201"
    timestamp: string;                  // ISO 8601 wall-clock string
    monotonicOffsetMs: number;          // Device monotonic timestamp (ms)
    clockIntegrity: 'verified' | 'suspicious' | 'unverified';
    deviceId: string;                   // Hardcoded or device ID string (e.g. 'dev-001')
  }
  ```
  **Critical Defect:** Crucial domain attributes required for backend persistence—such as `studentId`, `sessionId`, `matricNumber`, `lecturerId`, `punctuality`, and geographic coordinates—are completely omitted from `PendingQueueItem`!
  **Local Biometric Storage:** **Zero** biometric templates, ISO minutiae buffers, or fingerprint images are stored locally anywhere (IndexedDB, `localStorage`, files, memory caches, or console logs).

---

### Question 3: Local Storage & IndexedDB Key Inventory
- **File Paths:**
  - Token Management: [src/api/http-adapter.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L38, #L54)
  - IndexedDB Initialization: [src/services/offline-queue-service.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L13-L50)
- **Symbols:** `localStorage`, `STORE_PENDING`, `STORE_CALIBRATION`, `openDB`
- **Evidence Tag:** `[read]`
- **Verdict:** `implemented`
- **Detailed Finding:**
  The complete client-side storage inventory consists of:
  1. **`window.localStorage`**:
     - Key: `'bcams_auth_token'`
     - Type / Format: Plaintext JWT Bearer token string.
     - Sensitivity: **Sensitive** (stored unencrypted; vulnerable to local physical extraction or renderer XSS).
  2. **`IndexedDB` Database `bcams_offline_store` (Version 1)**:
     - Object Store 1: `pending_events` (KeyPath: `id` string). Holds `PendingQueueItem` records awaiting server push. Sensitivity: Low/Medium (contains student names and course codes, but no credentials or biometrics).
     - Object Store 2: `calibration_meta` (KeyPath: `key` string). Holds record `{ key: 'last_calibration', serverWallClock: string, deviceMonotonicMs: number, lastCalibratedAt: string }`. Sensitivity: Low (hardware timing metadata, unsigned).

---

### Question 4: syncNow Behavior on Success, Partial Failure, and Total Failure
- **File Path:** [src/stores/sync-store.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L148-L188)
- **Symbol:** `useSyncStore.getState().syncNow`
- **Evidence Tag:** `[read]`
- **Verdict:** `partial`
- **Detailed Finding:**
  - **On Success:** `syncNow` simulates network transmission using `await new Promise(r => setTimeout(r, 1200))` ([sync-store.ts#L152](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L152)). The actual network call `api.batchSync(get().pendingItems)` is commented out in code ([sync-store.ts#L154](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L154)). Upon timer expiry, it executes `await offlineQueue.clear()` ([sync-store.ts#L157](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L157)), which wipes all records from IndexedDB `pending_events` indiscriminately. It then writes a new calibration pair using `performance.now()`.
  - **Does it delete only server-confirmed items?** **NO.** It performs an all-or-nothing wipe without any server acknowledgment or per-item confirmation.
  - **On Partial Failure:** **Absent.** Because transmission is an uncalled timer simulation and `offlineQueue.clear()` deletes the entire database table, partial failure handling does not exist.
  - **On Total Failure:** If an exception is thrown in `syncNow` (e.g. IndexedDB error), `catch (err)` increments `failedEvents: get().failedEvents + count`, sets `isSyncing: false`, sets `lastError`, and leaves the queue untouched ([sync-store.ts#L182-L186](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L182-L186)).

---

### Question 5: Replay Endpoint & Report Reconciliation
- **File Paths:**
  - Desktop Client Adapter: [src/api/http-adapter.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L325-L327)
  - Backend Sync Controller: [bcams-be/src/modules/sync/sync.controller.ts](file:///Users/mac/Documents/projects/bcams-be/src/modules/sync/sync.controller.ts#L22)
  - Desktop Sync Store: [src/stores/sync-store.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L154)
- **Symbols:** `HttpApiAdapter.batchSync`, `SyncController.processBatchSync`, `useSyncStore.syncNow`
- **Evidence Tag:** `[read]`
- **Verdict:** `placeholder` / `inconsistent`
- **Reconciliation:**
  1. The 15 October As-Built Report claimed that replay automatically targets `/attendance/batch-sync`.
  2. In the desktop codebase, [src/api/http-adapter.ts#L325-L327](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L325-L327) defines:
     ```typescript
     async batchSync(events: unknown[]): Promise<{ synced: number; failed: number }> {
       return this.post<{ synced: number; failed: number }>('/attendance/batch-sync', { events });
     }
     ```
  3. However, `syncNow` in [sync-store.ts#L154](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L154) has this call **commented out**; it never calls `api.batchSync()` at runtime.
  4. Furthermore, the backend at `bcams-be` does **not** implement `/attendance/batch-sync`. The backend's real endpoint is `POST /sync/batch` ([bcams-be/src/modules/sync/sync.controller.ts#L22](file:///Users/mac/Documents/projects/bcams-be/src/modules/sync/sync.controller.ts#L22)). If `httpApi.batchSync()` were ever executed against `bcams-be`, it would fail with HTTP 404.

---

### Question 6: Event Idempotency Keys & Client Handling of Server Responses
- **File Paths:**
  - Item Creation: [src/stores/sync-store.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L226)
  - Service Queue: [src/services/offline-queue-service.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L79)
- **Symbols:** `addPendingItem`, `PendingQueueItem.id`
- **Evidence Tag:** `[read]`
- **Verdict:** `partial`
- **Detailed Finding:**
  - **Idempotency Key:** The event `id` field serves as the idempotency key, formatted as `evt-pend-${Math.random().toString(36).substring(2, 9)}`.
  - **Handling of Per-Event Server Responses:** **Absent.** Because `batchSync` is commented out and `syncNow` simulates sync via `setTimeout`, the client never receives, parses, or reconciles individual server status codes (such as `201 Created`, `409 Conflict`, `INVALID_SIGNATURE`, or `DUPLICATE_IGNORED`). The entire queue is cleared blindly.

---

### Question 7: Session State Changed on Server While Events Were Queued
- **File Paths:**
  - Capture Screen: [src/pages/attendance/capture.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/attendance/capture.tsx#L66-L70)
  - Sync Store: [src/stores/sync-store.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L148-L188)
- **Symbols:** `AttendanceCapturePage`, `api.getSession`, `syncNow`
- **Evidence Tag:** `[read]`
- **Verdict:** `absent`
- **Detailed Finding:**
  1. The client loads session details once on mount via `api.getSession(sessionId)` ([capture.tsx#L66](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/attendance/capture.tsx#L66)).
  2. The client does not poll the backend for session state updates, nor is there a WebSocket subscription for session cancellations or closures during capture.
  3. Queued items in `useSyncStore` do not even record the `sessionId`.
  4. If a session is closed, cancelled, or deleted on the server while events are queued offline, the client has **no reconciliation, rollback, or notification logic**. Upon sync, events would be processed blindly or dropped by the backend with no client UI feedback.

---

### Question 8: Offline Behavior Trace Per Workflow
- **File Paths:** All operational pages in [src/pages/](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/)
- **Evidence Tag:** `[read]`
- **Verdict:** `partial`
- **Detailed Finding:**
  1. **Login:**
     - Code Path: [src/pages/auth/login.tsx#L110-L126](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/auth/login.tsx#L110-L126) -> [src/stores/auth-store.ts#L34-L45](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/auth-store.ts#L34-L45) -> `api.getCurrentUser()`.
     - In HTTP mode offline, `fetch('/auth/me')` throws `TypeError: Failed to fetch`, wrapped as `ApiError: Network request failed`. Auth store sets `isAuthenticated: false, user: null`. **Login fails completely.**
     - In Mock mode, in-memory `mockUsers` are returned; login succeeds.
  2. **Session Create:**
     - Code Path: [src/pages/sessions/index.tsx#L261-L268](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/sessions/index.tsx#L261-L268) -> `api.createSession(newSession)`.
     - In HTTP mode offline, `POST /sessions` throws network error; catch block triggers `toast.error('Failed to activate class session')`. The session is **not created and not queued offline**.
  3. **Authorize (Lecturer Biometric Verification):**
     - Code Path: [src/pages/sessions/index.tsx#L173-L199](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/sessions/index.tsx#L173-L199) (`handleScanLecturer`).
     - Relies on in-memory `lecturers` state loaded on page mount. If app was opened offline in HTTP mode, `loadData()` failed, leaving the lecturer list empty and blocking authorization.
  4. **Activate:**
     - Code Path: [src/pages/sessions/index.tsx#L226-L269](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/sessions/index.tsx#L226-L269).
     - Geofence verification timer succeeds ([index.tsx#L216-L223](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/sessions/index.tsx#L216-L223)), but final activation calls `api.createSession()`, which fails offline in HTTP mode.
  5. **Capture (Student Class Attendance):**
     - Code Path: [src/pages/attendance/capture.tsx#L78-L142](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/attendance/capture.tsx#L78-L142) (`handleCapture`).
     - Calls `scannerService.startCapture()` (succeeds via mock/IPC).
     - Calls `api.submitAttendanceCapture(...)` with `.catch(() => {})` (silently ignores failure).
     - Calls `useSyncStore.getState().addPendingItem(...)` which saves to IndexedDB `pending_events` ([sync-store.ts#L224](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L224)).
     - **Capture successfully saves to local IndexedDB queue offline** (though with truncated schema).
  6. **Close (Session Closure):**
     - Code Path: [src/pages/attendance/capture.tsx#L145-L173](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/attendance/capture.tsx#L145-L173) (`handleVerifyLecturerForClosure`).
     - Calls `api.closeSessionWithLecturer(session.id, lecturerId)`.
     - In HTTP mode offline, network error is caught: `setCloseErrorMessage('Biometric transmission error. Please retry verification.')`. **Closure fails and is not queued.**
  7. **Gate Clock (Staff Turnstile Kiosk):**
     - Code Path: [src/pages/gate/index.tsx#L60-L142](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/gate/index.tsx#L60-L142) (`handleCaptureGateScan`).
     - Scanner simulation succeeds. Calls `await api.recordClockEvent(clockEvent)` ([gate/index.tsx#L92](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/gate/index.tsx#L92)).
     - There is **no offline queue wrapper** in `GateAttendancePage`!
     - In HTTP mode offline, `recordClockEvent` fails; caught at line 129, displaying `lastScanResult: { success: false, message: 'Scanner transmission error. Please retry verification.' }`. **Gate scans fail completely offline.**
  8. **Reports:**
     - Code Path: [src/pages/reports/index.tsx#L72-L107](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/reports/index.tsx#L72-L107).
     - `Promise.all([api.getDepartments(), ...])` fails; catch block triggers `toast.error('Failed to load analytics records')`. Renders blank screen.
  9. **Every Admin Page:**
     - Devices ([devices/index.tsx:L73](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/devices/index.tsx#L73)), People ([people/students.tsx:L87](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/people/students.tsx#L87)), Academic ([academic/courses.tsx:L38](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/academic/courses.tsx#L38)), Policies ([policies/index.tsx:L72](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/policies/index.tsx#L72)), Audit ([audit/index.tsx:L35](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/audit/index.tsx#L35)).
     - All fail on mount with `console.error` and toast notification; render empty tables.

---

### Question 9: App Restart Offline & Session Restoration
- **File Paths:**
  - App Root: [src/App.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/App.tsx#L55-L63)
  - Sync Store: [src/stores/sync-store.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L94-L122)
  - Capture State: [src/pages/attendance/capture.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/attendance/capture.tsx#L47)
- **Symbols:** `App.useEffect`, `initializeQueue`, `useState<Session | null>`
- **Evidence Tag:** `[read]`
- **Verdict:** `partial` (queue initialized, sessions lost)
- **Detailed Finding:**
  1. On restart, [src/App.tsx#L57](file:///Users/mac/Documents/projects/bcams-desktop/src/App.tsx#L57) executes `useSyncStore.getState().initializeQueue()`.
  2. `initializeQueue()` queries IndexedDB `pending_events` and `calibration_meta`, restoring queued pending items and calibration timestamps into Zustand memory.
  3. However, **Session restoration is completely absent**:
     - The active session object in `AttendanceCapturePage` is held solely in local React state (`useState<Session | null>(null)` at line 47).
     - It is never written to `localStorage` or `IndexedDB`.
     - Upon app restart or window reload, the active class session is lost. The router redirects to `/` (or `/login`), requiring the capturer to re-navigate or restart.

---

### Question 10: Locally Cached Reference Data & Expiry Policies
- **File Paths:**
  - Generic Hook: [src/hooks/use-data-fetch.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/hooks/use-data-fetch.ts#L23-L64)
  - Settings UI: [src/pages/settings/index.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/settings/index.tsx#L484-L490)
- **Symbols:** `useDataFetch`, "Clear Local Cache" button
- **Evidence Tag:** `[read]`
- **Verdict:** `absent`
- **Detailed Finding:**
  1. **Zero** reference entities (students, courses, course offerings, lecturers, staff, departments, or institutional policies) are cached in `localStorage`, `IndexedDB`, or filesystem.
  2. [src/hooks/use-data-fetch.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/hooks/use-data-fetch.ts#L23-L64) stores data in component-level React memory (`useState`). When a component unmounts, the data is garbage collected.
  3. Cache TTL is **0 ms**.
  4. In [src/pages/settings/index.tsx#L487-L489](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/settings/index.tsx#L487-L489), the UI displays a button labeled "Clear Local Cache"; inspection reveals it has **no `onClick` handler** and does nothing.

---

### Question 11: Geolocation Service Behavior, Accuracy, and Coordinates
- **File Paths:**
  - Session Geofence: [src/pages/sessions/index.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/sessions/index.tsx#L216-L223)
  - Capture Page: [src/pages/attendance/capture.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/attendance/capture.tsx#L57)
  - Electron Permissions: [electron/main.js](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js#L248-L251)
- **Symbols:** `verifyGeofenceLocation`, `geofenceStatus`, `setPermissionRequestHandler`
- **Evidence Tag:** `[read]`
- **Verdict:** `absent` / `mocked`
- **Detailed Finding:**
  1. The report cited `src/services/geolocation-service.ts` and Haversine formula calculation. Inspection of the filesystem proves that [src/services/geolocation-service.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/services/) does **not exist**.
  2. No code invokes `navigator.geolocation.getCurrentPosition` or `navigator.geolocation.watchPosition`.
  3. Geofence checks in [src/pages/sessions/index.tsx#L216-L223](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/sessions/index.tsx#L216-L223) use a hardcoded 1000ms `setTimeout`:
     ```typescript
     const verifyGeofenceLocation = () => {
       setIsCheckingGeofence(true);
       setTimeout(() => {
         setIsCheckingGeofence(false);
         setGeofenceVerified(true);
         setGeofenceDistance(38); // hardcoded 38 metres
       }, 1000);
     };
     ```
  4. Accuracy and freshness checks are **absent**.
  5. Coordinates (latitude, longitude, altitude) are **never stored** on attendance events.

---

### Question 12: Monotonic Calibration Pair Storage & System Transitions
- **File Paths:**
  - Storage & Schema: [src/services/offline-queue-service.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L189-L235)
  - Cross-Check Math: [src/stores/sync-store.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L191-L203)
  - Main IPC Time: [electron/main.js](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js#L96-L102)
- **Symbols:** `CalibrationPair`, `saveCalibration`, `computeIntegrityStatus`, `app:getSystemTime`
- **Evidence Tag:** `[read]`
- **Verdict:** `implemented`
- **Detailed Finding:**
  1. **Storage:** Stored in IndexedDB `bcams_offline_store`, store `calibration_meta`, record key `'last_calibration'`: `{ key: 'last_calibration', serverWallClock: string, deviceMonotonicMs: number, lastCalibratedAt: string }`.
  2. **Who can modify it:** Any code in the renderer process can execute `useSyncStore.getState().syncNow()` or `offlineQueue.saveCalibration()`. No cryptographic signature, HMAC, or server-issued nonce protects the anchor.
  3. **Behavior across transitions (Static Analysis):**
     - **Reboot:** In [electron/main.js#L99](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js#L99), `process.hrtime.bigint()` resets on reboot. When a reboot occurs, `currentMonotonic < calibrationPair.deviceMonotonicMs`. In [sync-store.ts#L194-L195](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L194-L195), `monotonicDeltaMs < 0` triggers `clockIntegrity = 'unverified'`.
     - **Sleep / Hibernate:** On macOS Darwin and Windows, OS monotonic counters typically pause or suspend during system sleep, whereas wall-clock time continues to advance. When the workstation wakes up, `currentWallClock` outpaces `expectedTimeMs = serverWallClock + monotonicDeltaMs`. In [sync-store.ts#L198-L201](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L198-L201), if sleep duration exceeds 5 minutes (`driftMinutes > 5`), subsequent events are classified as `'suspicious'`.

---

### Question 13: Punctuality Computation Authority (Client vs Server)
- **File Paths:**
  - Client Kiosk: [src/pages/gate/index.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/gate/index.tsx#L76-L77)
  - Backend Service: [bcams-be/src/modules/session-gate/gate.service.ts](file:///Users/mac/Documents/projects/bcams-be/src/modules/session-gate/gate.service.ts#L160-L185)
- **Symbols:** `GateAttendancePage.handleCaptureGateScan`, `GateService.recordScan`
- **Evidence Tag:** `[read]`
- **Verdict:** `partial` / `inconsistent`
- **Detailed Finding:**
  - In code today, punctuality is computed on **both** client and server.
  - The client calculates punctuality directly in [src/pages/gate/index.tsx#L76-L77](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/gate/index.tsx#L76-L77):
    ```typescript
    const isLate = currentHour > 10 || (currentHour === 10 && now.getMinutes() > 0);
    const punctuality = eventType === 'clock_in' ? (isLate ? 'late' : 'on-time') : undefined;
    ```
    The client renders this classification immediately to the screen ("On-Time Arrival" vs "Late Arrival") and sends it in the `ClockEvent` payload.
  - The backend at `bcams-be` also computes punctuality in `gate.service.ts`.
  - Under Locked Decision L5, the server is authoritative and client values are strictly advisory; client UI currently displays its locally computed value as definitive.

---

### Question 14: Token Storage, Lifetimes, Refresh, Revocation, and Idle Timeout
- **File Paths:**
  - Token Management: [src/api/http-adapter.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L29, #L38, #L50-L58, #L108-L110)
  - Auth Store: [src/stores/auth-store.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/auth-store.ts#L47-L50)
- **Symbols:** `HttpApiAdapter.token`, `setToken`, `getToken`, `logout`
- **Evidence Tag:** `[read]`
- **Verdict:** `partial`
- **Detailed Finding:**
  - **Storage:** Persisted in `window.localStorage` under key `'bcams_auth_token'` ([http-adapter.ts#L54](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L54)) and in private memory variable `this.token`.
  - **Lifetimes:** The client does not decode JWT expiration (`exp` claim). Lifetime is treated as indefinite.
  - **Refresh:** **Absent.** No refresh tokens, interceptors, or background refresh loops exist.
  - **Revocation:** **Passive only.** If any API call returns HTTP 401 Unauthorized, [http-adapter.ts#L108-L110](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L108-L110) clears the token from `localStorage`. Client `logout()` only resets local Zustand state and does not call any server revocation endpoint.
  - **Idle Timeout:** **Absent.** No user interaction listeners or session idle timeout timers exist.

---

### Question 15: Scope Parameters in API Requests
- **File Paths:**
  - HTTP Adapter: [src/api/http-adapter.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L163, #L168, #L185, #L216-L220, #L231, #L254, #L271)
  - Reports Filtering: [src/pages/reports/index.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/reports/index.tsx#L84-L92)
- **Symbols:** `department_id`, `offering_id`, `loadData`
- **Evidence Tag:** `[read]`
- **Verdict:** `partial` (implemented for department; absent for lecturer)
- **Detailed Finding:**
  - **Department Scope:** Sent as URL query parameters in HTTP requests:
    - Courses: `GET /courses?department_id=...`
    - Course Offerings: `GET /course-offerings?department_id=...`
    - Students: `GET /students?department_id=...`
    - Academic Enrollments: `GET /academic/enrollments?department_id=...`
    - Lecturers: `GET /lecturers?department_id=...`
    - Staff: `GET /staff?department_id=...`
  - **Lecturer Scope:** **Never sent to the API.** `getSessions` only takes `offering_id`. In [src/pages/reports/index.tsx#L84-L92](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/reports/index.tsx#L84-L92), lecturer scoping is executed entirely **client-side** by filtering arrays in memory:
    ```typescript
    let filteredOfferings = offsData;
    if (userRole === 'lecturer' && user?.staffId) {
      filteredOfferings = offsData.filter(o =>
        o.primaryLecturerId === user.staffId || ...
    ```

---

### Question 16: Comprehensive Inventory of Role & Capability Checks
- **File Paths:**
  - Router: [src/App.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/App.tsx#L92-L167)
  - Sidebar: [src/components/layout/sidebar.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/components/layout/sidebar.tsx#L29-L140)
  - Command Palette: [src/components/common/command-palette.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/components/common/command-palette.tsx#L41-L62)
  - Permissions Helper: [src/lib/permissions.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/lib/permissions.ts)
  - Electron IPC: [electron/main.js](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js#L84-L219)
- **Symbols:** `RoleGuard`, `sidebarItems`, `CommandPalette`, `ipcMain.handle`
- **Evidence Tag:** `[read]`
- **Verdict:** `partial` (Bypasses present)
- **Detailed Finding:**
  *(Full mapping documented in [authorization-check-map.md](file:///Users/mac/Documents/projects/bcams-desktop/docs/programme/desktop/authorization-check-map.md)).*
  - **Protected Routes with `RoleGuard`:** `/gate/records` (super_admin), `/people/staff` (super_admin), `/academic/enrollment` (super_admin, hod), `/enrollment` (super_admin, hod), `/devices` (super_admin), `/policies` (super_admin), `/reports` (super_admin, hod, lecturer), `/audit` (super_admin).
  - **Unprotected Routes (Bypasses):**
    - `/` (Dashboard): Open to all roles.
    - `/sessions`: **No route guard.** Any authenticated user can access the session schedule.
    - `/sessions/:sessionId`: **No route guard.**
    - `/attendance`: **No route guard.** Any authenticated user can view class attendance logs.
    - `/gate`: **No route guard.** Any user can open the gate turnstile scanner interface.
    - `/people/students`, `/people/lecturers`: **No route guard.**
    - `/academic/departments`, `/academic/courses`: **No route guard.**
  - **Adapter & IPC Bypasses:** Neither `HttpApiAdapter` nor `electron/main.js` checks user roles or capabilities. Any renderer script can trigger hardware IPC calls (`scanner:startCapture`) regardless of logged-in identity.

---

### Question 17: Electron Runtime Hardening & Packaging Security
- **File Paths:**
  - Main Process: [electron/main.js](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js)
  - Preload: [electron/preload.js](file:///Users/mac/Documents/projects/bcams-desktop/electron/preload.js)
  - HTML Entry: [index.html](file:///Users/mac/Documents/projects/bcams-desktop/index.html)
  - Packaging Config: [package.json](file:///Users/mac/Documents/projects/bcams-desktop/package.json#L70-L87)
- **Symbols:** `webPreferences`, `setWindowOpenHandler`, `build`
- **Evidence Tag:** `[read]`
- **Verdict:** `security concern`
- **Detailed Finding:**
  1. **DevTools reachable in packaged build?** **YES.** DevTools is not disabled in `webPreferences` (`devTools: false` absent), menu is not stripped, and global shortcut accelerators are not blocked.
  2. **Content Security Policy (CSP) set?** **NO.** [index.html](file:///Users/mac/Documents/projects/bcams-desktop/index.html) has no CSP `<meta>` tag, and `electron/main.js` does not set `Content-Security-Policy` HTTP headers.
  3. **will-navigate and webview creation handled?** **NO.** `mainWindow.webContents.setWindowOpenHandler` is defined ([main.js#L45](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js#L45)), but `contents.on('will-navigate')` and `contents.on('will-attach-webview')` are **not handled**.
  4. **IPC validation (input & sender)?** **NO.** None of the 13 IPC handlers validate `event.sender` or `event.senderFrame`, and parameters are not schema-validated.
  5. **Electron fuses set?** **NONE.** `@electron/fuses` is not in `package.json`, and no fuse-toggling scripts exist.
  6. **ASAR integrity enabled?** **NO.** `package.json#L70-L87` does not specify `asarIntegrity`.
  7. **App loading protocol:** Loaded via standard **`file://` protocol** (`mainWindow.loadFile(...)` in [main.js#L56](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js#L56)). No custom scheme (`app://` or `bcams://`).
  8. **Deep-linking / custom-protocol handling:** **Absent.** `app.setAsDefaultProtocolClient` is not implemented.
  9. **Auto-update mechanism:** **Absent.** Neither `electron-updater` nor `autoUpdater` is installed or configured.
  10. **Code signing:** **Absent.** `package.json#build` has no code-signing certificate configuration.

---

### Question 18: Electron Version Support & Lifecycle Policy
- **File Paths:**
  - Dependency: [package.json](file:///Users/mac/Documents/projects/bcams-desktop/package.json#L56)
- **Symbols:** `"electron": "^33.2.1"`
- **Evidence Tag:** `[read]`
- **Verdict:** `unsupported` / `EOL`
- **Detailed Finding:**
  `package.json` specifies Electron `^33.2.1`. The official Electron project release policy actively supports only the latest 3 major versions. With stable releases currently past version 40 (e.g. Electron 42/43/44), **Electron 33 is officially End-of-Life (EOL)** and no longer receives Chromium security patches.

---

### Question 19: Geolocation Permission Offline & Provider API Keys
- **File Paths:**
  - Main Process: [electron/main.js](file:///Users/mac/Documents/projects/bcams-desktop/electron/main.js#L248-L251)
- **Symbols:** `contents.session.setPermissionRequestHandler`
- **Evidence Tag:** `[read]`
- **Verdict:** `absent` / `non-functional offline`
- **Detailed Finding:**
  1. In `electron/main.js`, `setPermissionRequestHandler` automatically returns `true` for `geolocation`.
  2. However, Chromium's desktop geolocation engine relies on Google Network Location Provider (Wi-Fi triangulation and IP geo-lookup).
  3. No `GOOGLE_API_KEY` is configured in environment variables or configuration files.
  4. When an Electron desktop workstation is offline, network-based geolocation returns `PositionError.POSITION_UNAVAILABLE` or timeouts.
  5. In practice, the desktop application never calls `navigator.geolocation` anyway (it is 100% mocked with `setTimeout`).

---

### Question 20: WebSocket Simulation, Protocol Encryption, and Authentication
- **File Paths:**
  - Service: [src/services/websocket-service.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/services/websocket-service.ts#L26-L174)
  - Unit Tests: [src/__tests__/offline-and-services.test.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/__tests__/offline-and-services.test.ts#L4, #L116-L151)
- **Symbols:** `WebSocketService`, `wsService`, `startSimulation`
- **Evidence Tag:** `[read]`
- **Verdict:** `partial` / `dormant`
- **Detailed Finding:**
  1. **Reachable in production builds:** `startSimulation()` ([websocket-service.ts#L141-L163](file:///Users/mac/Documents/projects/bcams-desktop/src/services/websocket-service.ts#L141-L163)) is an instance method on `WebSocketService`. It is bundled into production bundles with no `import.meta.env.DEV` guards. However, it is never called by any UI screen (only imported in unit tests).
  2. **Protocol Encryption:** Defaults to unencrypted `ws://localhost:8000/ws/events` ([websocket-service.ts#L37](file:///Users/mac/Documents/projects/bcams-desktop/src/services/websocket-service.ts#L37)); `wss://` is not enforced.
  3. **Authentication:** **Unauthenticated.** `new WebSocket(this.url)` passes no Authorization header, JWT bearer token, ticket, or cookie.

---

### Question 21: Development Personas, Auto-Login, and Arbitrary-Credential Gates
- **File Paths:**
  - Login UI: [src/pages/auth/login.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/auth/login.tsx#L41-L99, #L110-L126)
  - App Auto-Login: [src/App.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/App.tsx#L59-L63)
- **Symbols:** `roleProfiles`, `handleRoleSelect`, `handleSubmit`, `App.useEffect`
- **Evidence Tag:** `[read]`
- **Verdict:** `implemented-unprotected`
- **Detailed Finding:**
  1. **Dev Personas:** Live in [src/pages/auth/login.tsx#L41-L99](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/auth/login.tsx#L41-L99) (`roleProfiles`). They render 5 one-click cards on the login screen. **Gating:** None. They are unconditionally visible to anyone viewing the screen.
  2. **Auto-Login:** Lives in [src/App.tsx#L59-L63](file:///Users/mac/Documents/projects/bcams-desktop/src/App.tsx#L59-L63):
     ```typescript
     if (!isAuthenticated) {
       login('user-sa');
     }
     ```
     **Gating:** None. On app startup, it unconditionally logs the user in as `user-sa` (Super Administrator).
  3. **Arbitrary-Credential Login:** Lives in [src/pages/auth/login.tsx#L119-L126](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/auth/login.tsx#L119-L126):
     ```typescript
     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       setIsSubmitting(true);
       await login('user-sa');
       setIsSubmitting(false);
       navigate('/');
     };
     ```
     **Gating:** None. Entering any arbitrary username/password logs in as Super Admin.

---

### Question 22: Logging Output & Potential PII / Token / Biometric Leakage
- **File Paths:**
  - Error Boundary: [src/components/common/error-boundary.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/components/common/error-boundary.tsx#L35)
  - Component Catches: 12 screen files in `src/pages/`
- **Symbols:** `console.error`
- **Evidence Tag:** `[read]`
- **Verdict:** `implemented` (console-only)
- **Detailed Finding:**
  1. BCAMS Desktop has **no persistent disk logging** (`fs`, `winston`, `pino`, or `electron-log` are absent).
  2. Logging consists solely of `console.error` calls in React component catch blocks.
  3. **Tokens & Biometrics:** Auth tokens and biometric templates are not passed to console logs.
  4. **PII Risk:** [src/components/common/error-boundary.tsx#L35](file:///Users/mac/Documents/projects/bcams-desktop/src/components/common/error-boundary.tsx#L35) logs component stack traces (`console.error('[BCAMS ErrorBoundary]', error, errorInfo)`). If an unhandled render error occurs while displaying student rosters or staff records, student names and registration numbers may be printed to DevTools console output.

---

### Question 23: Third Same-Day Gate Scan Behavior in Code
- **File Paths:**
  - Gate UI: [src/pages/gate/index.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/gate/index.tsx#L68-L117)
  - Scanner Simulator: [src/services/scanner-service.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/services/scanner-service.ts#L52)
  - Mock Adapter: [src/api/mock-adapter.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/api/mock-adapter.ts#L691-L708)
  - Backend Service: [bcams-be/src/modules/session-gate/gate.service.ts](file:///Users/mac/Documents/projects/bcams-be/src/modules/session-gate/gate.service.ts#L201)
- **Symbols:** `handleCaptureGateScan`, `recordClockEvent`, `STAFF_GATE_EXTRA_SCAN_IGNORED`
- **Evidence Tag:** `[read]`
- **Verdict:** `partial` / `inconsistent`
- **Detailed Finding:**
  - **Locked Decision L11:** "Staff gate rules: 9:00 AM to 5:00 PM expected hours, 60-minute grace, one clock-in and one clock-out per day, a third same-day scan is ignored totally: it is not recorded, not flagged and not stored."
  - **As-Built Report Claim:** Extra scans beyond 2 are recorded but flagged.
  - **Actual Behavior in Code:**
    1. In the client [src/pages/gate/index.tsx#L72-L73](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/gate/index.tsx#L72-L73), the kiosk does **not** count daily scans per staff member. It uses a naive time-of-day heuristic: `currentHour >= 14 ? 'clock_out' : 'clock_in'`.
    2. If the scanner simulator returns `type: 'duplicate'`, [gate/index.tsx#L108-L117](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/gate/index.tsx#L108-L117) **flags** it on the screen: `"Extra scan detected: Already recorded for this shift"` and does not post to the API.
    3. If the scanner simulator returns `type: 'success'`, the client blindly posts every scan (even a 3rd or 4th) to `api.recordClockEvent()`.
    4. On the backend ([bcams-be/src/modules/session-gate/gate.service.ts#L201](file:///Users/mac/Documents/projects/bcams-be/src/modules/session-gate/gate.service.ts#L201)), a 3rd scan creates an audit log entry (`STAFF_GATE_EXTRA_SCAN_IGNORED`), which also violates L11.

---

### Question 24: HOD Access to Gate Records & Staff Attendance Reports
- **File Paths:**
  - Route Guard: [src/App.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/App.tsx#L92-L99)
  - Sidebar Navigation: [src/components/layout/sidebar.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/components/layout/sidebar.tsx#L63-L68)
  - Permission Definition: [src/lib/permissions.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/lib/permissions.ts#L117-L119)
  - Reports Screen: [src/pages/reports/index.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/reports/index.tsx)
- **Symbols:** `RoleGuard roles={['super_admin']}`, `canViewGateLedger`
- **Evidence Tag:** `[read]`
- **Verdict:** `implemented` (Super Admin ONLY; conforms to Decision O4, conflicts with PRD)
- **Detailed Finding:**
  1. In [src/App.tsx#L95](file:///Users/mac/Documents/projects/bcams-desktop/src/App.tsx#L95), `/gate/records` is guarded by `<RoleGuard roles={['super_admin']}>`. HODs attempting to navigate here are redirected to `/`.
  2. In [src/components/layout/sidebar.tsx#L67](file:///Users/mac/Documents/projects/bcams-desktop/src/components/layout/sidebar.tsx#L67), the Gate Attendance menu entry is visible exclusively when `isSuperAdmin(user)`.
  3. In [src/lib/permissions.ts#L117-L119](file:///Users/mac/Documents/projects/bcams-desktop/src/lib/permissions.ts#L117-L119), `canViewGateLedger` returns `isSuperAdmin(user)`.
  4. [src/pages/reports/index.tsx](file:///Users/mac/Documents/projects/bcams-desktop/src/pages/reports/index.tsx) contains only student class attendance analytics tabs; it has no staff gate reports.
  5. **Policy Alignment:** Code conforms to **Decision O4** ("only Super Admin sees gate and staff attendance reports; HODs cannot"), but directly conflicts with the PRD specification stating HODs can print own-department reports.

---

### Question 25: npm audit Vulnerability Inventory
- **Tool / Command:** `npm audit` in `bcams-desktop`
- **Evidence Tag:** `[read]`
- **Verdict:** `implemented` (Recorded, no fixes applied)
- **Execution Output:**
  ```text
  36 vulnerabilities (11 moderate, 20 high, 5 critical)
  ```
  **Critical Vulnerabilities (5):**
  - `shell-quote` (1.8.4 - 1.10.0): Command injection via line terminator in token after comment (GHSA-pqg4-j6r4-53mv; dependency of `concurrently`).
  - `tar` (<=7.5.20): Arbitrary file overwrite, hardlink path traversal, symlink poisoning (GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97; dependency of `electron-builder`).
  - `tinypool` (<=2.1.1): Prototype pollution gadget in worker options leading to RCE (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr; dependency of `vitest`).
  
  **High Vulnerabilities (20):**
  - `electron` (<=41.10.5): ASAR Integrity Bypass (GHSA-vmqv-hx8q-j7mg), AppleScript injection (GHSA-5rqw-r77c-jp79), Service worker IPC spoofing (GHSA-xj5x-m3f3-5x3h), contextBridge prototype setter hijack (GHSA-ff2p-hmqr-hxm4), DevTools arbitrary file execution (GHSA-f2r8-jv7c-xqmp).
  - `app-builder-lib` & `builder-util-runtime`: Uncontrolled search path and credential leaks (GHSA-7g7r-gx96-252g, GHSA-p2f4-r6v6-j797).
  - `braces` (*): Stack-exhaustion DoS in glob matcher (GHSA-vfj7-8cjw-p6xm; dependency of `tailwindcss`).
  - `extract-zip` (*): Unvalidated symlink path traversal (GHSA-jmr9-qjv8-65gv).
  - `http-cache-semantics` (<=4.2.0): Cross-user cached response disclosure (GHSA-ch52-4w7c-c8xp).

  **Moderate Vulnerabilities (11):**
  - `@vitest/mocker`: Path traversal (GHSA-82fw-gwwq-j7x9).
  - `esbuild`: Cross-origin request read on dev server (GHSA-67mh-4wv8-2f99).
  - `postcss-selector-parser`: CPU exhaustion DoS (GHSA-rj75-hqrm-r3gf).
  - `react-router` (6.0.0 - 7.17.0): Open redirect via backslash & constructor injection (GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg).
  - `sprintf-js`: Denial of service via unbounded precision (GHSA-hp3w-g68c-fv3c).

---

## 2. Report vs Code Discrepancies Table

Where the 15 October As-Built Report (`BCAMS_CURRENT_STATE_REPORT.md`) and the actual code conflict, **the code wins**. The table below catalogs all discrepancies.

| # | Topic / Area | 15 October As-Built Report Claim | Actual Code Ground Truth | Severity | Finding ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Test Suite Count** | "15 passed, 0 failed (150 total tests across 15 test suites)" (Section 1.1) | Exactly 4 test files and 24 tests exist in `src/__tests__/` (`npm test` passes 24/24). 11 test suites and 126 tests were fabricated in the report. | High | F-015 |
| 2 | **Geolocation Service** | Claims `src/services/geolocation-service.ts` calculates real-time Haversine distance from venue coordinates (Section 8.3). | `src/services/geolocation-service.ts` does **not exist**. Geofence check is a hardcoded 1000ms `setTimeout` setting distance to 38m (`src/pages/sessions/index.tsx#L216-L223`). No coordinates exist on events. | High | F-016 |
| 3 | **Sync Replay Endpoint** | "Upon detecting network restoration, `sync-store.ts` automatically replays queued events to `/attendance/batch-sync`" (Section 8.5). | `syncNow()` has `api.batchSync()` **commented out** and runs a 1200ms `setTimeout`, wiping IndexedDB blindly. Furthermore, backend implements `/sync/batch`, not `/attendance/batch-sync`. | High | F-017 |
| 4 | **Gate Extra Scan Handling** | "Additional scans beyond 2 are recorded but flagged as extra scans" (Section 3.2, 7.8). | Client kiosk does not track scan counts; uses naive `currentHour >= 14` for clock-out. Duplicate mock scans show a UI toast and are **not recorded**. If mock returns success, scans are recorded unconditionally. Conflicts with Locked Decision L11 (third scan must be totally ignored). | Medium | F-018 |
| 5 | **Offline Gate Turnstile** | Claims gate terminal functions offline and queues clock events to IndexedDB (Section 8.5). | `GateAttendancePage` has **no offline queue wrapper**. Scans call `api.recordClockEvent()`, which fails offline with "Scanner transmission error". Zero offline persistence for gate scans. | High | F-019 |
| 6 | **Academia Admin Screen** | Claims a consolidated single-pane workspace exists at `/academic/academia` with 4 tabs (Section 1.2, 7.4). | `/academic/academia` does **not exist**. Routes are separated into `/academic/departments`, `/academic/courses`, and `/academic/enrollment`. | Low | F-020 |
| 7 | **HOD Report Permissions** | PRD and Report state HOD can access and export staff gate attendance for their department. | HOD has zero access to gate records in code. `/gate/records` is locked to `super_admin` only in route guards, sidebar, and permissions. (Conforms to Decision O4; report is obsolete). | Low | F-021 |
| 8 | **Dev Personas & Auto-Login** | Presented as intentional evaluation tools. | Implemented completely unprotected with zero production/environment gating. Any user on `/login` can click any role card, or submit arbitrary text to gain Super Admin privileges. App automatically authenticates as Super Admin on mount. | Critical | F-022 |
| 9 | **Electron Runtime Hardening** | Implied standard secure desktop architecture. | DevTools accessible in production, CSP absent, `will-navigate` unhandled, IPC handlers unvalidated, fuses unset, ASAR integrity disabled, Electron 33 is EOL. | High | F-023 |
| 10 | **WebSocket Live Feeds** | Claims live event streams feed turnstile and attendance telemetry (Section 8.6). | `wsService` is never imported or used by any UI component. Default URL is unencrypted `ws://` with no authentication tokens. | Medium | F-024 |
