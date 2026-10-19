# Programme Open Questions Register

This document tracks ambiguities, unresolved architectural decisions, policy clarifications, and environment prerequisites identified during chunk execution.

## Policy on Ambiguity
Per Programme Rule 8:
- If an ambiguity is **non-blocking**, choose the most conservative, secure option, record the assumption applied in this register, and proceed.
- If **blocked**, or the action is irreversible or destructive, halt execution and escalate immediately.

---

## Register

| ID | Raised in | Question | Assumption applied | Needs answer from | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Q-001 | C0.2 | How should the offline event queue schema be structured to carry complete domain foreign keys? | Assume C2.3 will redesign `PendingQueueItem` to hold full `AttendanceCaptureDto` / `ClockEventDto` payloads with cryptographic signatures per L2 and L3. | Architect (C2.3) | open |
| Q-002 | C0.2 | Should gate turnstile clock events share the same IndexedDB store as class attendance events? | Assume C2.3/C2.7 will unify gate clock-in/out and class attendance into a single signed offline event queue table per L1. | Architect (C2.3) | open |
| Q-003 | C0.3 | Biometric enrollment minimum finger threshold: Should backend align to 4-finger minimum for activation or maintain 2-finger minimum? | Assume conservative secure option: align to 4-finger minimum for activation per SRS FR-2.2 and desktop domain contract. | Architect (C1.7) | open |
| Q-004 | C0.3 | How should the client submit lecturer biometric verification to `SessionGateController.closeSession`? | Assume C1.4/C1.5 will extend `CloseSessionDto` with `lecturerPersonId` and signed device biometric assertion matching `session.conductingLecturerId` per L2, L3, and L5. | Architect (C1.5) | open |
| Q-005 | C0.4 | Should explicit biometric consent tracking fields (`biometricConsentGiven`, `consentTimestamp`) be incorporated into the Prisma `Person` schema? | Assume yes: add `biometricConsentGiven Boolean @default(false)` and `consentTimestamp DateTime?` during C1.0 data model update to satisfy NDPA/NDPR DPIA requirements. | Architect (C1.0) | open |
| Q-006 | C0.5 | Which server-side biometric matching implementation should be selected for Decision O12? | Assume Option A (ZKFinger 10.0 Linux x64 C shared library via Node.js FFI) as primary, with Option B (SourceAFIS pure software ISO 19794-2) as fallback per C0.5 spike report. | Architect (C0.6) | open |
