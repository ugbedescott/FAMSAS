# BCAMS Personal & Biometric Data Inventory

**Document Reference:** `docs/programme/security/data-inventory.md`  
**Programme Chunk:** C0.4 (Threat model and security requirements)  
**Authoritative Baselines:** Locked Decisions L1 to L16, Open Decisions O1 to O12, C0.1, C0.2, C0.3, PRD v1.3, SRS v1.1  
**Regulatory Benchmarks:** Nigeria Data Protection Act (NDPA 2023), Nigeria Data Protection Regulation (NDPR), General Data Protection Regulation (GDPR) benchmark

---

## 1. Regulatory Context & Governance

BCAMS processes both standard Personal Identifiable Information (PII) and **Sensitive Personal Data** (biometric fingerprint templates) for students, academic staff, and administrative personnel of a tertiary institution.

Under the **Nigeria Data Protection Act (NDPA 2023)** and international privacy standards:
1. **Biometric Data** constitutes a special category of sensitive data requiring:
   - An explicit lawful basis (consent or legitimate educational/employment contract necessity).
   - Mandatory technical safeguards (encryption at rest, purpose limitation, prohibition of secondary processing).
   - A formal Data Protection Impact Assessment (DPIA) prior to system deployment.
2. Under **Locked Decision L2**, fingerprint matching is hybrid: the server holds all authoritative templates, while client devices hold only an encrypted, scoped subset that expires with the 7-day offline lease (**Decision O2**).
3. Under **Decision O7**, biometric and personal data retention is tied to the student's graduation/withdrawal or staff member's exit, plus a 30-day grace period.

---

## 2. Personal & Biometric Data Inventory

| Data Element | Category | Storage Location | Processing Purpose & Lawful Basis | Authorized Access Roles | Proposed Retention Schedule | Cryptographic Safeguards |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Biometric Reference Templates** | Sensitive Biometric Data | **Server:** PostgreSQL (`biometric_enrollments` table).<br>**Client:** Encrypted local SQLite. | Biometric identity verification for class attendance and staff gate turnstile access. *(Lawful basis: Explicit Consent & Educational Enrollment Contract)*. | **Server:** System matching engine only.<br>**Client:** Scoped local matching engine.<br>*(Zero human access to raw minutiae)*. | **`[placeholder]`** Retained until graduation, withdrawal, or staff exit, plus 30-day grace period per Decision O7. | AES-256-GCM encryption at rest with server envelope key; Client encryption via OS `safeStorage`. Raw images discarded immediately after minutiae extraction. |
| **Transient Biometric Probes** | Ephemeral Biometric Data | **Client:** Volatile RAM only.<br>**Server:** Volatile RAM (server match). | Real-time 1:1 or 1:N biometric probe matching during live capture. *(Lawful basis: Explicit Consent)*. | Scanner driver & matching engine only. | **`[placeholder]`** Zero persistent retention. Overwritten in RAM immediately following match evaluation ($< 2$ seconds). | Ephemeral memory allocation; zero disk logging; zero network transmission without TLS 1.3 encryption. |
| **Student Core Identity** (Matric No, Full Name, Email, Phone, Gender) | Personal Data (PII) | **Server:** PostgreSQL (`students`, `persons` tables).<br>**Client:** Local SQLite (scoped roster). | Student registration, course enrollment, clearance eligibility identification. *(Lawful basis: Educational Contract)*. | Super Admin, HOD (own department), Lecturer (assigned courses), Self. | **`[placeholder]`** Core academic transcript record retained permanently; contact details purged 5 years post-graduation. | TLS 1.3 in transit; encrypted disk volume at rest; sanitized exports. |
| **Student Academic Enrollment** (Level, Programme, Session, Semester) | Academic Record | **Server:** PostgreSQL (`academic_enrollments`, `course_offerings`).<br>**Client:** Local SQLite. | Tracking semester progression, eligible course offerings, and exam qualification. *(Lawful basis: Educational Contract)*. | Super Admin, HOD (department), Lecturer (course), Student Capturer. | **`[placeholder]`** Retained permanently as part of institutional academic archives. | Database transaction integrity; foreign key constraints; audit log tracking. |
| **Staff Core Identity** (Staff No, Full Name, Email, Phone, Department, Staff Type) | Personal Data (PII) | **Server:** PostgreSQL (`staff`, `persons` tables).<br>**Client:** Local SQLite (scoped). | Staff employment records, turnstile gate clocking, lecturer assignment. *(Lawful basis: Employment Contract)*. | Super Admin, HOD (own department staff), Self. | **`[placeholder]`** Retained for duration of employment plus 7 years (statutory institutional employment requirement). | TLS 1.3 in transit; database row-level access control. |
| **Class Attendance Events** (`AttendanceEvent`, Session, Student, Timestamp, Coordinates) | Institutional Attendance Record | **Server:** PostgreSQL (`attendance_events`).<br>**Client:** Local SQLite pending queue. | Proof of classroom presence for semester course exam clearance. *(Lawful basis: Educational Contract & Institutional Policy)*. | Super Admin, HOD (department), Lecturer (course), Student (own records). | **`[placeholder]`** Retained for 5 academic years post-session completion to support accreditation audits. | Event signed by device private key (`L3`); monotonic clock integrity flag (`L9`); geofence distance re-evaluated (`L10`). |
| **Staff Gate Clock Events** (`ClockEvent`, Staff, Timestamp, Type, Punctuality) | Employment Attendance Record | **Server:** PostgreSQL (`clock_events`).<br>**Client:** Kiosk local queue. | Monitoring staff arrival/departure, punctuality, campus security physical access. *(Lawful basis: Employment Contract)*. | **Super Admin ONLY** per Decision O4.<br>*(HODs and Lecturers strictly excluded)*. | **`[placeholder]`** Retained for 3 calendar years to support annual institutional performance reviews. | Signed event records; strictly 1 clock-in and 1 clock-out per day; 3rd scan totally discarded per Locked Decision L11. |
| **User Authentication Credentials** (Password Hashes, Activation Tokens) | Security Credential | **Server:** PostgreSQL (`users` table). | Authentication to BCAMS application. *(Lawful basis: Security Integrity)*. | System authentication service only. | **`[placeholder]`** Single-use activation tokens expire in 72 hours (Decision O6). Password hashes retained until reset. | Argon2id / bcrypt password hashing (work factor 12); single-use tokens hashed with SHA-256. Zero plaintext admin visibility (Decision L8). |
| **Device Cryptographic Credentials** (Public Keys, Device Tokens, Signatures) | Device Identity Credential | **Server:** PostgreSQL (`devices`).<br>**Client:** OS Keystore (`safeStorage`). | Endpoint authentication, request signing, device lifecycle enforcement. *(Lawful basis: System Security)*. | Super Admin (device console), Main Process. | **`[placeholder]`** Retained until device is permanently retired or revoked in device registry. | Asymmetric Ed25519 / RSA key pairs; client private key stored in OS-level hardware-backed keystore. |
| **Cryptographic Audit Trail** (`AuditLog`, Actor, Action, Entity, Hash Chain) | Regulatory Audit Record | **Server:** PostgreSQL (`audit_logs` table). | Accountability, tamper detection, security compliance. *(Lawful basis: Legal Obligation & Security)*. | Super Admin (read-only inspection). Zero edit or delete access for any role. | **`[placeholder]`** Security and authentication events kept indefinitely per Decision O8; operational logs kept for 5 years. | Append-only schema; SHA-256 hash chaining ($H_n = \text{SHA256}(H_{n-1} \parallel \text{Entry}_n)$); atomic transactional write. |

---

## 3. Data Protection Principles Alignment

### 3.1 Lawfulness, Fairness & Transparency
- Personal and biometric data processing is tied strictly to enrollment in the tertiary institution and employment contracts.
- Prior to biometric capture, every individual is presented with a clear, plain-language consent notice detailing what is captured, how minutiae templates are generated, and where data is stored.

### 3.2 Purpose Limitation & Secondary Processing Prohibition
- Biometric templates are used **exclusively** for attendance verification within the institution.
- Selling, sharing, or repurposing biometric data for commercial, tracking, or law-enforcement purposes (outside valid court warrants) is strictly prohibited.

### 3.3 Data Minimization
- **No Raw Fingerprint Images:** Raw optical/capacitive fingerprint images are converted to mathematical minutiae representations (ISO/IEC 19794-2) inside volatile RAM and immediately destroyed. Raw images are never saved to disk or transmitted across the network.
- **Derived Absence:** Class absences are derived dynamically at query time (`Absence = Enrolled - Present`) and are never persisted as separate database rows, preventing unnecessary storage of negative tracking records.
- **Scoped Client Caching:** Under **Locked Decision L2**, client terminals do not receive the institutional biometric database; they receive only an encrypted subset scoped strictly to active sessions.

### 3.4 Accuracy & Rectification
- Student and staff biographical data can be updated by authorized department administrators or self-service profiles.
- Under **Locked Decision L12**, manual attendance correction and override are out of scope. If an event is flagged as `SUSPICIOUS` due to clock drift, an administrator can attach an explanatory review note, but the underlying biometric event record is immutable.

### 3.5 Storage Limitation & Purge Lifecycle (Placeholder Schedule)
- **Biometric Templates:** Retained for the duration of academic enrollment or employment, plus a 30-day grace period (**Decision O7**), after which records are cryptographically shredded (`AES` key destruction and database row hard-deletion).
- **Temporary Offline Leases:** Scoped biometric templates stored on local terminals expire and are automatically cleared after 7 days (**Decision O2**).
- **Security Audit Logs:** Maintained indefinitely to satisfy institutional accreditation and forensic audit standards (**Decision O8**).

### 3.6 Integrity and Confidentiality (Security Safeguards)
- **Encryption at Rest:** Server database volumes encrypted with AES-256. Biometric template columns encrypted with dedicated envelope encryption. Client SQLite databases encrypted using keys protected by Electron `safeStorage`.
- **Encryption in Transit:** Strict TLS 1.3 for all client-server communications with certificate pinning.
- **Zero Plaintext Token Storage:** Elimination of plaintext JWT tokens from client `localStorage` ([`F-027`](file:///Users/mac/Documents/projects/bcams-desktop/docs/programme/FINDINGS.md#L52)).

---

## 4. Biometric Consent Notice Specification

During student matriculation and staff onboarding, every data subject must review and sign (or digitally acknowledge via single-use token) the following mandatory consent declaration:

```text
BIOMETRIC ATTENDANCE SYSTEM DATA PROTECTION & CONSENT DECLARATION

Institution: [Tertiary Institution Name]
System: Biometric Class Attendance Management System (BCAMS)

1. PURPOSE OF PROCESSING
The Institution collects and processes your fingerprint biometric data solely for:
  a) Verifying your physical attendance at academic lectures, laboratory sessions, and examinations.
  b) Managing staff physical gate access, punctuality, and campus entry verification.

2. WHAT DATA IS COLLECTED
  - We DO NOT store pictures or photographic images of your fingerprints.
  - When your finger is scanned, our secure sensor extracts mathematical points of reference (minutiae).
  - This minutiae template is converted into an encrypted digital code. It is impossible to reconstruct your actual fingerprint image from this digital template.

3. DATA STORAGE & SECURITY
  - Your encrypted biometric template is stored securely in the Institution's central database using AES-256-GCM encryption.
  - Authorized classroom and turnstile terminals only cache a temporary, encrypted copy of your template for the duration of your active classes.
  - Terminals automatically delete local copies within 7 days.

4. YOUR RIGHTS
Under the Nigeria Data Protection Act (NDPA) and Institutional Privacy Regulations, you have the right to:
  - Request confirmation of whether your biometric data is held.
  - Request rectification of inaccurate personal identity records.
  - Lodge a formal complaint with the Institution's Data Protection Officer (DPO).

5. RETENTION & DELETION
Your biometric template will be permanently and securely deleted from all systems upon graduation, formal withdrawal from the University, or cessation of employment, following a 30-day administrative grace period.

6. ACCOMMODATION FOR BIOMETRIC DISABILITY
If you possess a physical disability, skin condition, or scarring that prevents reliable fingerprint capture, you are entitled to register through the Dean of Student Affairs / Human Resources for an approved institutional alternative clearance protocol.

DECLARATION & CONSENT:
[ ] I hereby confirm that I have read and understood this notice. I freely give explicit consent for [Institution Name] to collect, process, and securely store my fingerprint minutiae templates for the attendance purposes specified above.
```

---

## 5. Data Protection Impact Assessment (DPIA) Pre-Rollout Checklist

Prior to production deployment (`Phase 3`), the institutional Data Protection Officer (DPO) and security engineering team must review and approve the following DPIA verification items:

- [ ] **DPIA-01: Raw Image Purge Verification:** Confirm through static code analysis and memory dump testing that zero raw image buffers (BMP, PNG, RAW) are written to disk or transmitted across network interfaces.
- [ ] **DPIA-02: Cryptographic Isolation of Templates:** Confirm that database administrators without access to the hardware security module (HSM) or application envelope key cannot view or decrypt stored minutiae templates.
- [ ] **DPIA-03: Scope Restriction Auditing:** Verify that client terminals only download student templates for courses scheduled at that terminal, preventing mass roster harvesting.
- [ ] **DPIA-04: Non-Discrimination & Accessibility Alternative:** Confirm that an operational runbook exists for students with finger scarring or amputations to verify attendance without penalty.
- [ ] **DPIA-05: Incident Breach Notification Runbook:** Document a step-by-step procedure to notify the Nigeria Data Protection Commission (NDPC) within 72 hours in the event of an unauthorized extraction of device keystores or database compromise.
- [ ] **DPIA-06: Consent Ledger Integrity:** Ensure that biometric capture cannot be initiated for any student or staff record unless a signed consent flag (`biometricConsentGiven: true`) is recorded in the database.
