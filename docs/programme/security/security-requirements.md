# BCAMS Security Requirements

**Document Reference:** `docs/programme/security/security-requirements.md`  
**Programme Chunk:** C0.4 (Threat model and security requirements)  
**Authoritative Baselines:** Locked Decisions L1 to L16, Open Decisions O1 to O12, C0.1, C0.2, C0.3, PRD v1.3, SRS v1.1  
**Scope:** `bcams-desktop` at `./bcams-desktop` and `bcams-be` at `./bcams-be`

---

## 1. Specification Framework & Verification Taxonomy

This document establishes the definitive, testable security requirements governing BCAMS. Every requirement specifies exactly one verifiable behavior, the subsystem responsible, the implementing programme chunk, the verification test type, and the abuse cases or STRIDE threats mitigated.

### Verification Test Types
- **Unit Test:** Automated test verifying deterministic function logic, validation rules, or edge cases.
- **Integration Test:** Automated multi-component test executing against real or containerized services.
- **Security Negative Test:** Automated test deliberately attempting unauthorized mutations, forged signatures, or boundary violations to confirm rejection.
- **Offline Failure-Injection Test:** Test simulating network partitioning, disk corruption, or process termination during critical operations.
- **Static Analysis & Inspection:** Automated code analysis (linters, AST checks, secret scanners) or manual verification of compiled bundle contents.
- **Hardware Spike / Test:** Physical verification using connected scanner hardware in real operating conditions.

---

## 2. Authoritative Security Requirements Register

| ID | Security Requirement Statement | Target Subsystem | Implementing Chunk | Verification Method | Threats / Abuse Cases Mitigated |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SR-001** | The backend device registry shall reject any API request lacking a valid cryptographic signature verified against the public key of an active registered device. | Backend API Gateway | `C1.4` | Security Negative Test | `AC-07`, Spoofing |
| **SR-002** | The desktop client main process shall cryptographically sign every outbound attendance capture and clock event payload using an asymmetric device private key stored in OS secure storage. | Desktop Main Process | `C1.4`, `C2.3` | Unit Test | `AC-05`, `AC-07`, Tampering |
| **SR-003** | The device registration service shall bind registered device identities to a unique hardware fingerprint and peripheral scanner serial number, rejecting events if the reported scanner serial does not match the bound device profile. | Device Registry | `C1.4` | Integration Test | `AC-07`, Spoofing |
| **SR-004** | The backend gateway shall reject API calls from any device whose lifecycle state is `pending`, `suspended`, or `revoked` with an HTTP 403 Forbidden response. | Backend API Gateway | `C1.4` | Security Negative Test | `AC-07`, Unauthorized Access |
| **SR-005** | The desktop local data layer shall record an unalterable monotonic offset elapsed from an authenticated server calibration pair on every queued capture event. | Desktop Main Process | `C2.3` | Unit Test | `AC-03`, Tampering |
| **SR-006** | The backend clock integrity service shall evaluate wall-clock divergence against expected monotonic elapsed time and flag any event with divergence exceeding 5 minutes as `SUSPICIOUS` while counting it toward qualification per Decision O5. | Backend Sync Service | `C1.6` | Unit Test | `AC-03`, Tampering |
| **SR-007** | The backend clock integrity service shall classify any event with a negative monotonic delta relative to the last calibration anchor as `UNVERIFIED`. | Backend Sync Service | `C1.6` | Unit Test | `AC-04`, Tampering |
| **SR-008** | The backend sync service shall cryptographically sign all time calibration responses binding server wall-clock time, device ID, and client request nonce to prevent man-in-the-middle time spoofing. | Backend Sync Service | `C1.4`, `C1.6` | Integration Test | `AC-13`, MITM |
| **SR-009** | The desktop local data layer shall maintain an append-only, sequential SHA-256 hash chain over all pending offline events such that any deletion, reordering, or insertion of records invalidates the chain. | Desktop Main Process | `C2.3` | Offline Failure-Injection Test | `AC-05`, Tampering |
| **SR-010** | The desktop application shall encrypt the local SQLite database and cached biometric template files at rest using AES-256-GCM with encryption keys protected by Electron `safeStorage`. | Desktop Main Process | `C2.3` | Security Inspection Test | `AC-05`, `AC-08`, Info Disclosure |
| **SR-011** | The desktop sync client shall cache only the biometric reference templates of students and staff participating in the device's currently assigned active course offerings or turnstile scopes, never caching the entire institutional roster. | Sync & Template Service | `C1.7`, `C2.3` | Integration Test | `AC-08`, Info Disclosure |
| **SR-012** | The desktop main process shall enforce a 7-day offline lease window, blocking new class capture sessions upon lease expiration until an online synchronization occurs, and tagging post-lease gate scans with a `lease_expired` flag. | Desktop Main Process | `C2.5`, `C2.7` | Offline Failure-Injection Test | `AC-15`, DoS |
| **SR-013** | The desktop application shall immediately erase all cached biometric templates, credentials, and offline rosters upon receiving a device revocation or remote wipe directive from the backend. | Device Management | `C1.8`, `C2.5` | Integration Test | `AC-08`, Information Disclosure |
| **SR-014** | The backend sync ingestion service shall process all event batches idempotently, discarding repeat submissions of existing event UUIDs without creating duplicate database rows or throwing unhandled errors. | Backend Sync Service | `C1.6` | Unit Test | `AC-06`, Replay Attack |
| **SR-015** | The database schema and attendance service shall enforce a strict unique constraint on `(sessionId, studentId)` preventing more than one attendance event per student per session. | Backend Attendance | `C1.5` | Integration Test | `AC-06`, Duplicate Capture |
| **SR-016** | The staff gate service shall determine clock direction strictly by daily scan count (1st scan = CLOCK_IN, 2nd scan = CLOCK_OUT), completely ignoring client-supplied direction heuristics. | Backend Gate Service | `C1.5` | Unit Test | `AC-02`, Tampering |
| **SR-017** | The staff gate service shall totally discard any third or subsequent scan by the same staff member on the same calendar day without writing a database record, audit entry, or error flag per Locked Decision L11. | Backend Gate Service | `C1.5` | Unit Test | `AC-02`, Tampering |
| **SR-018** | The scanner driver interface shall enable hardware-level Live Finger Detection (LFD) on the ZKTeco optical sensor to reject fake silicone, gelatin, or printed biometric presentation attacks. | Hardware Integration | `C0.5`, `C2.6` | Hardware Test / Spike | `AC-01`, Spoofing |
| **SR-019** | The backend session service shall reject any session closure request that does not include a valid biometric verification probe matching the identical lecturer identity who authorized the session start per Rule R-005. | Backend Session Service | `C1.5` | Integration Test | `AC-19`, Elevation of Privilege |
| **SR-020** | The backend session service shall reject session authorization for a course offering if an existing session for that offering is currently in `ACTIVE` status. | Backend Session Service | `C1.5` | Integration Test | Concurrency Conflict |
| **SR-021** | The backend attendance service shall calculate the distance between the captured event coordinates and approved venue coordinates, rejecting any event outside the approved radius outright with an HTTP 400 Bad Request error per Locked Decision L10. | Backend Attendance | `C1.5` | Unit Test | Boundary Bypass |
| **SR-022** | The backend gate service shall process staff clock events without requiring or validating geographic coordinates, enforcing fixed physical terminal placement as the primary control per Locked Decision L4. | Backend Gate Service | `C1.5` | Unit Test | Operational Exemption |
| **SR-023** | The backend shall authenticate all non-public API requests exclusively using verified JWT Bearer access tokens, rejecting unverified client headers such as `x-user-id` and `x-user-role-claim`. | Backend Auth Gateway | `C1.1` | Security Negative Test | `AC-11`, Spoofing |
| **SR-024** | The desktop client shall store authentication tokens exclusively in Main Process secure memory or OS-protected `safeStorage`, completely eliminating plaintext token persistence in browser `localStorage`. | Desktop Client Auth | `C2.4` | Static Analysis & Inspection | `AC-10`, Token Theft |
| **SR-025** | The backend authorization layer shall restrict Heads of Department (HOD) strictly to querying and mutating resources within their appointed department, returning HTTP 403 Forbidden on cross-department requests. | Backend Authorization | `C1.2` | Security Negative Test | `AC-11`, Elevation of Privilege |
| **SR-026** | The backend reports controller shall restrict access to staff gate clock ledgers and reports exclusively to users holding the `SUPER_ADMINISTRATOR` role per Decision O4, rejecting HOD requests with HTTP 403 Forbidden. | Backend Authorization | `C1.2`, `C1.5b` | Security Negative Test | `AC-11`, Info Disclosure |
| **SR-027** | The backend audit service shall record all security, authentication, and domain mutations in the same database transaction as the business operation, computing an append-only SHA-256 hash chain over previous log entries per Locked Decision L6. | Backend Audit Service | `C1.3` | Transactional Integration Test | Repudiation, Tampering |
| **SR-028** | The backend API and client applications shall contain zero endpoints, parameters, database mutations, or UI controls capable of manually correcting, overriding, or creating retroactive attendance events per Locked Decision L12. | Domain API & UI | `C1.5`, `C2.4` | Security Negative Test & API Audit | Tampering, Unauthorized Override |
| **SR-029** | The desktop application and backend identity service shall prohibit offline biometric enrollment, requiring an active server connection to perform 1:N duplicate template detection across the institutional database prior to enrollment per Decision O11. | Identity & Biometrics | `C1.7`, `C2.4` | Integration Test | `AC-16`, Identity Fraud |
| **SR-030** | The identity service shall require at least 4 active enrolled fingers before activating a person's biometric status to `enrolled` and permitting participation in biometric capture per Rule R-016. | Identity Service | `C1.7` | Unit Test | `AC-16`, Insufficient Quality |
| **SR-031** | The desktop build configuration and runtime shall strictly exclude mock adapters, developer persona buttons, and automatic debug logins from all production bundles per Locked Decision L7. | Desktop Tooling & Build | `C2.1`, `C2.4` | Build Artifact Audit Test | `AC-17`, Backdoor Exploitation |
| **SR-032** | The desktop Electron main process configuration shall enforce `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, disabled DevTools in production, and handle `will-navigate` events to prevent arbitrary URL loading. | Desktop Electron Main | `C2.1` | Automated Configuration Test | `AC-09`, `AC-18`, IPC Exploit |
| **SR-033** | The desktop update manager shall verify all downloaded application update packages against an embedded, pinned institutional public certificate before applying the update per Decision O10. | Desktop Packaging | `C2.9` | Smoke Test | `AC-12`, Malicious Update |
| **SR-034** | The reporting and export utilities shall prepend a single quote `'` and escape any field value starting with `=`, `+`, `-`, `@`, tab, or carriage return prior to generating downloadable CSV files. | Export Utilities | `C1.5b`, `C2.8` | Unit Test | `AC-14`, Formula Injection |
| **SR-035** | The backend session gate controller shall authorize session creation and capture workspace activation only for users who possess an active `Student` identity bound with the `session_capture` capability assignment per Locked Decision L15. | Backend Authorization | `C1.2` | Integration Test | `AC-18`, Elevation of Privilege |
| **SR-036** | The desktop application shall define and enforce an HTTP/meta Content Security Policy that restricts script execution strictly to local bundled assets and disables `unsafe-eval` and `unsafe-inline`. | Desktop Security | `C2.1` | Static Analysis Test | `AC-10`, Script Injection |

---

## 3. Abuse Case Traceability Matrix

The table below demonstrates full traceability from every abuse case identified in [`threat-model.md`](file:///Users/mac/Documents/projects/bcams-desktop/docs/programme/security/threat-model.md) to its enforcing Security Requirements and implementing programme chunks.

| Abuse Case ID | Abuse Case Name | Security Requirements Enforcing Mitigation | Implementing Chunks |
| :--- | :--- | :--- | :--- |
| **AC-01** | Proxy Attendance via Fake Biometrics | `SR-018` | `C0.5`, `C2.6` |
| **AC-02** | Staff Gate Buddy Punching at Turnstiles | `SR-016`, `SR-017` | `C1.5`, `C2.5`, `C2.7` |
| **AC-03** | System Clock Rollback to Falsify Punctuality | `SR-005`, `SR-006` | `C1.6`, `C2.3` |
| **AC-04** | Offline Reboot-then-Change-Clock Exploit | `SR-007` | `C1.6`, `C2.3` |
| **AC-05** | Local Pending Queue Manipulation or Deletion | `SR-002`, `SR-009`, `SR-010` | `C1.4`, `C2.3` |
| **AC-06** | Network Replay Attack on Sync Ingestion | `SR-014`, `SR-015` | `C1.5`, `C1.6` |
| **AC-07** | Forged Events from Unregistered / Spoofed Device | `SR-001`, `SR-002`, `SR-003`, `SR-004` | `C1.4`, `C2.3` |
| **AC-08** | Template Harvesting from Stolen Terminal | `SR-010`, `SR-011`, `SR-012`, `SR-013` | `C1.7`, `C2.3`, `C2.5` |
| **AC-09** | Modified Client Binary Claiming Biometric Match | `SR-031`, `SR-032`, `SR-033` | `C2.1`, `C2.6`, `C2.9` |
| **AC-10** | Token Theft from Plaintext Browser Storage | `SR-024`, `SR-036` | `C2.1`, `C2.4` |
| **AC-11** | Privilege Escalation via Parameter Tampering | `SR-023`, `SR-025`, `SR-026` | `C1.1`, `C1.2`, `C1.5b` |
| **AC-12** | Supply Chain Tampering via Malicious Update | `SR-033` | `C2.9` |
| **AC-13** | MITM Shifting Time Calibration Anchor | `SR-008` | `C1.4`, `C1.6` |
| **AC-14** | CSV Formula Injection in Reports | `SR-034` | `C1.5b`, `C2.8` |
| **AC-15** | Offline Lease Expiration Abuse | `SR-012` | `C2.5`, `C2.7` |
| **AC-16** | Biometric Enrollment under False Identity | `SR-029`, `SR-030` | `C1.1`, `C1.7` |
| **AC-17** | Development Persona & Auto-Login Backdoor | `SR-031` | `C2.1`, `C2.4` |
| **AC-18** | Direct Route Navigation Guard Bypass | `SR-032`, `SR-035` | `C2.1`, `C2.4`, `C2.5` |
| **AC-19** | Unverified / Malicious Session Closure | `SR-019` | `C1.5`, `C2.7` |

---

## 4. Phase Verification Allocation

| Programme Phase | Verification Focus | Primary Verification Methods Applied |
| :--- | :--- | :--- |
| **Phase 1 (Backend Build)** | `SR-001`, `SR-003`, `SR-004`, `SR-006` to `SR-008`, `SR-014` to `SR-017`, `SR-019` to `SR-023`, `SR-025` to `SR-030`, `SR-034`, `SR-035`. | Unit Tests, Integration Tests, Security Negative Matrix (`C1.2`). |
| **Phase 2 (Desktop Hardening)** | `SR-002`, `SR-005`, `SR-009` to `SR-013`, `SR-018`, `SR-024`, `SR-031` to `SR-034`, `SR-036`. | Electron Config Tests (`C2.1`), Offline Failure Injection (`C2.3`), Scanner Contract Tests (`C2.6`). |
| **Phase 3 (Final Verification)** | Complete end-to-end verification of all 36 Security Requirements (`SR-001` to `SR-036`). | Security verification suite (`C3.2`), Failure-injection harness (`C3.1`), Penetration tests. |
