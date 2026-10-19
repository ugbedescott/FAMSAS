# BCAMS Desktop: Local Storage and Persistence Inventory

This document provides a comprehensive, code-verified inventory of all client-side persistent storage mechanisms in the `bcams-desktop` application, covering `window.localStorage`, `IndexedDB`, session storage, and memory caches.

---

## 1. Storage Architecture Overview

The desktop client utilizes two client-side storage mechanisms:
1. **`window.localStorage`**: Used exclusively for persisting authentication tokens across window reloads.
2. **`IndexedDB` (`bcams_offline_store`)**: Used for the offline event queue and monotonic clock calibration anchors.

There is **zero** local persistence using SQLite, LevelDB, NeDB, encrypted keystores (e.g. OS Keychain/DPAPI via Electron `safeStorage`), or raw filesystem files.

---

## 2. Window LocalStorage Inventory

| Key | Type | Size / Cardinality | Content Description | Sensitive? | Read Location | Write Location | Delete / Clear Location |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `bcams_auth_token` | `string` | 1 entry (approx. 200–500 bytes) | Plaintext JWT Bearer token used for authenticating outbound HTTP requests to the backend. | **YES (High)** | [src/api/http-adapter.ts#L38](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L38) | [src/api/http-adapter.ts#L54](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L54) | [src/api/http-adapter.ts#L56](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L56), [src/api/http-adapter.ts#L109](file:///Users/mac/Documents/projects/bcams-desktop/src/api/http-adapter.ts#L109) |

### 2.1 Security Assessment of `localStorage`
- **Plaintext Storage:** The authentication token is stored unencrypted in the Chromium web storage directory (`LocalStorage/app_*.localstorage`).
- **No Secure Storage Wrapper:** Electron provides `safeStorage` (which encrypts data using Windows DPAPI, macOS Keychain, or Linux Secret Service), but `bcams-desktop` does not utilize it.
- **XSS Exposure:** Any script executing in the renderer context (or via DevTools, which remains enabled in production builds) can read `localStorage.getItem('bcams_auth_token')`.
- **Indefinite Lifetime:** The token is not parsed for JWT expiration claims and persists until an explicit HTTP 401 response clears it.

---

## 3. IndexedDB Inventory (`bcams_offline_store`)

The application defines a single IndexedDB database initialized in [src/services/offline-queue-service.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L35-L50).

- **Database Name:** `bcams_offline_store`
- **Database Version:** `1`
- **Driver:** Native Web API `indexedDB.open` with a custom Promise wrapper class `OfflineQueueService`.
- **Fallback:** In-memory arrays (`memoryQueue: PendingQueueItem[]`, `memoryCalibration: CalibrationPair | null`) when IndexedDB is blocked or running in unit tests.

### 3.1 Object Store: `pending_events`

| Attribute | Specification |
| :--- | :--- |
| **Object Store Name** | `pending_events` |
| **Primary Key (`keyPath`)** | `id` (string) |
| **Auto-Increment** | `false` |
| **Indexes** | None created |
| **Purpose** | Persisting operational attendance events captured while offline, pending server sync. |
| **Sensitivity** | **Medium** (contains student names, course codes, device IDs, and monotonic clock offsets; contains NO passwords, tokens, or biometric minutiae). |
| **Code Locations** | Enqueue: [offline-queue-service.ts#L75-L105](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L75-L105)<br>Read All: [offline-queue-service.ts#L110-L138](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L110-L138)<br>Delete By ID: [offline-queue-service.ts#L143-L162](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L143-L162)<br>Clear Store: [offline-queue-service.ts#L167-L184](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L167-L184) |

#### Exact Schema Definition
```typescript
interface PendingQueueItem {
  id: string;                         // Unique event ID: 'evt-pend-' + Math.random().toString(36).substring(2, 9)
  type: 'attendance' | 'clock' | 'session' | 'system';
  description: string;                // e.g. "Oluwaseun Adeyemi — CSC 201"
  timestamp: string;                  // ISO 8601 string of device wall-clock time
  monotonicOffsetMs: number;          // Monotonic elapsed time from performance.now() or Electron process.uptime()
  clockIntegrity: 'verified' | 'suspicious' | 'unverified';
  deviceId: string;                   // Hardware endpoint identifier (default 'dev-001')
}
```

#### Schema Deficiencies & Gaps
1. **Missing Domain Foreign Keys:** The record lacks `studentId`, `sessionId`, and `courseOfferingId`.
2. **Missing Biometric Verification Data:** The record lacks `matchingConfidence`, probe minutiae count, or verification mode.
3. **Missing Geo-Location:** Does not contain `latitude`, `longitude`, `accuracy`, or `geofenceDistance`.
4. **Missing Device Signature:** Does not contain an asymmetric cryptographic signature or device key ID (violating Locked Decision L3).

---

### 3.2 Object Store: `calibration_meta`

| Attribute | Specification |
| :--- | :--- |
| **Object Store Name** | `calibration_meta` |
| **Primary Key (`keyPath`)** | `key` (string) |
| **Auto-Increment** | `false` |
| **Indexes** | None created |
| **Purpose** | Persisting the FR-4 Monotonic Clock Cross-Check calibration anchor across app restarts. |
| **Sensitivity** | **Low** (hardware timestamps; tampering could lead to false clock-integrity warnings or bypass drift detection). |
| **Code Locations** | Save Anchor: [offline-queue-service.ts#L189-L208](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L189-L208)<br>Get Anchor: [offline-queue-service.ts#L210-L235](file:///Users/mac/Documents/projects/bcams-desktop/src/services/offline-queue-service.ts#L210-L235) |

#### Exact Schema Definition
```typescript
interface CalibrationRecord {
  key: 'last_calibration';            // Fixed record primary key
  serverWallClock: string;            // ISO 8601 server anchor timestamp
  deviceMonotonicMs: number;          // Device monotonic timestamp in milliseconds at the anchor instant
  lastCalibratedAt: string;           // ISO 8601 timestamp when anchor was recorded locally
}
```

#### Tamper Resistance Evaluation
- **No Cryptographic Proof:** The calibration pair is written directly by renderer JavaScript ([src/stores/sync-store.ts#L169](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts#L169)). It contains no HMAC, no server RSA/Ed25519 signature, and no server certificate pinning.
- **Renderer Manipulation:** Any script in the renderer or any user with DevTools access can mutate `last_calibration` to simulate valid monotonic clock synchronization.

---

## 4. In-Memory Stores & Caches Inventory

### 4.1 Zustand State Stores
1. **`useAuthStore`** ([src/stores/auth-store.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/auth-store.ts)):
   - Stores `user: User | null`, `isAuthenticated: boolean`, `isLoading: boolean`.
   - **Persistence:** None (held in volatile JavaScript memory).
2. **`useSyncStore`** ([src/stores/sync-store.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/stores/sync-store.ts)):
   - Stores `connection: ConnectionStatus`, `pendingItems: PendingQueueItem[]`, `calibrationPair: CalibrationPair`, `isSyncing: boolean`, `lastSyncTime: string | null`, `lastError: string | null`.
   - **Persistence:** Synchronized with IndexedDB `pending_events` and `calibration_meta`.

### 4.2 Component-Level Ephemeral Caches
- **`useDataFetch<T>`** ([src/hooks/use-data-fetch.ts](file:///Users/mac/Documents/projects/bcams-desktop/src/hooks/use-data-fetch.ts)):
  - Stores queried API entities in `useState<T | null>`.
  - **TTL:** 0 ms (destroyed on component unmount).

---

## 5. Summary Matrix & Compliance Check

| Storage Medium | Key / Store | Stored Data | Security Classification | Compliance Status |
| :--- | :--- | :--- | :--- | :--- |
| `localStorage` | `bcams_auth_token` | JWT Bearer Token | Sensitive (Plaintext Token) | **Non-compliant** (Should use Electron `safeStorage`) |
| `IndexedDB` | `pending_events` | Queued Attendance Events | Medium (PII: Student Names) | **Deficient Schema** (Missing essential domain foreign keys) |
| `IndexedDB` | `calibration_meta` | Monotonic Timing Anchor | Low (Timing Metadata) | **Unsigned** (Vulnerable to local tampering) |
| `Filesystem` | None | None | N/A | Fully Compliant (No plaintext biometric templates written) |
