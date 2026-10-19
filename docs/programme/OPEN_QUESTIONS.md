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
