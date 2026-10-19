# Decision Register

This document records the locked and open architectural, domain, and operational decisions governing the BCAMS project.

---

## 3. Decision register

### 3.1 Locked decisions (agents must not reopen these)

| ID | Decision |
| :--- | :--- |
| L1 | Offline-first covers capture, gate, session lifecycle and lecturer authorization. Admin CRUD, imports, exports and reports are online-only. |
| L2 | Fingerprint matching is hybrid. The server is the authority and holds all templates. Devices cache a scoped, encrypted subset and match locally, which works offline. The server also matches: to identify a person who is outside a device's local scope while it is online, to re-verify probes sent with events, and to detect duplicate enrollments. The local cache expires with the offline lease. |
| L3 | Devices are registered identities with a key pair, signed events, a lifecycle (pending, active, suspended, revoked) and a bound scanner serial. |
| L4 | Gate Terminal has no user login. Its mode comes from its registered device role, not from a URL. It runs in kiosk mode. Gate has no geofence, so the registered fixed location is the control. |
| L5 | The server is authoritative for punctuality, clock integrity, geofence re-evaluation and attendance qualification. Client values are advisory. |
| L6 | Audit is server-side, append-only, written in the same transaction as the change, hash-chained, and separate from operational logs and attendance events. |
| L7 | No mock adapter in production bundles. The client is generated from the backend OpenAPI spec. Demos use a seeded database. |
| L8 | Accounts are activated by invitation (single-use hashed token, admin never sees a password), with an activation-code fallback for users without email, a reset flow, Super Admin MFA, and step-up re-authentication for critical actions. |
| L9 | Clock protection extends the existing monotonic-clock design: authenticated time anchor, server reconstruction of event time, per-device hash chain. The verified, suspicious and unverified semantics stay. |
| L10 | Class-session geofence violations are rejected outright with feedback. |
| L11 | Staff gate rules: 9:00 AM to 5:00 PM expected hours, 60-minute grace, one clock-in and one clock-out per day, a third same-day scan is ignored totally: it is not recorded, not flagged and not stored. |
| L12 | Manual attendance correction and override are out of scope for now: no endpoints, screens or schema. Flagged events are visible and can be acknowledged with a note, and acknowledging never changes attendance outcomes. |
| L13 | Mobile is out of scope, but sync, signing and clock logic are written framework-agnostic for later reuse. |
| L14 | Scanner is ZKTeco, behind a port with USB and Bluetooth transports generalized. The biometric engine is an adaptable module. |
| L15 | Session Capturer is a capability on a Student. There is no Gate Capturer. |
| L16 | No paid dependencies. Every tool, library, service and certificate must be free to use at this project's scale. Free tiers are checked before anything relies on them. |

---

### 3.2 Open decisions (defaults apply if you do not decide; all are placeholders)

| ID | Question | Default |
| :--- | :--- | :--- |
| O1 | Desktop geofence when offline and no accurate location fix | DECIDED: desktop is used mainly for gate clock-in and clock-out, which has no geofence, and class capture is done on mobile phones with GPS. No offline location design is built for desktop. If a desktop ever captures a class session, known to be outside is rejected (L10) and unknown blocks session start, with no extra location engineering |
| O2 | Offline lease length | DECIDED: 7 days. Still a default: gate terminals keep working after expiry with a lease_expired flag, workstations block new captures |
| O3 | Probe template retention | If this is fingerprint template then no purge except what is mentioned on O7 |
| O4 | HOD access to own-department staff gate reports (PRD says yes, desktop currently Super Admin only) | DECIDED: only Super Admin sees gate and staff attendance reports. HODs cannot. Update the PRD and SRS to match |
| O5 | Do suspicious events count toward qualification while unreviewed | Yes, counted and flagged. Drift threshold 5 minutes |
| O6 | Email provider and activation-code policy for students | No paid dependency (decided). Provider-neutral SMTP adapter, so the provider is a configuration choice. Free options (limits as of July 2026, recheck before relying on them): Brevo 300 emails a day, Resend 3,000 a month capped at 100 a day, Mailgun 100 a day. The institution's own mail server is the best sender if it exists. Activation code is 12 characters, valid 72 hours, requires matric number confirmation |
| O7 | Personal data and template purge schedule | On graduation, withdrawal or staff exit, plus 30-day grace |
| O8 | Audit retention | Security events kept indefinitely, others per institution policy |
| O9 | Offline login method | Cached password verifier plus optional device PIN |
| O10 | Code-signing certificate and update hosting | Free path: a self-issued code-signing certificate that the institution's own PCs are set to trust during deployment, installers delivered directly (USB or internal share), updates verified against the pinned certificate. DECIDED: no paid dependency is allowed, so this is the path. The private key is kept offline with a backup, and C2.9 proves that Windows and the updater accept the certificate. If the updater cannot verify it, add a pinned-key signature check on update packages |
| O11 | Can biometric enrollment happen offline | No. Enrollment and re-enrollment need a connection, because identity binding and duplicate detection need the server |
| O12 | Where server-side matching runs | Decided from C0.5 question 8. If the SDK cannot run on the backend operating system, the options are reported and you choose |

*Operational Note:* Decided: a third same-day scan is ignored totally. The report says extra scans are recorded and flagged, so C0.2 must locate that behavior and C1.6 and C2.7 must remove it.

---

### 3.3 Change-log table

| Date | Decision | Change | Who |
| :--- | :--- | :--- | :--- |
| 2026-10-18 | L1–L16, O1–O12 | Initial programme baseline established from pack specification | Programme Bootstrap (C0.0) |
