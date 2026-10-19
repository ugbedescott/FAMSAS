# Programme Findings Register

This register records all defects, security concerns, architectural limitations, inconsistencies, incomplete implementations, test gaps, and documentation gaps discovered throughout the BCAMS programme.

## Classification Taxonomy
- `bug`: Erroneous behavior or runtime failure in existing implementation.
- `incomplete implementation`: Partial feature or missing edge case/sub-path.
- `inconsistency`: Contradiction between documents, contracts, UI, or backend behavior.
- `security concern`: Flaw impacting authentication, authorization, cryptography, tamper-proofing, or privacy.
- `architectural limitation`: Structural impediment requiring redesign or bounded refactoring.
- `test gap`: Missing test suite or lack of automated regression verification.
- `documentation gap`: Missing or contradictory specifications, schemas, or guides.

## Severity Definitions
- **Critical**: Exploitable security flaw, or data loss or corruption in a core workflow.
- **High**: Core workflow broken or security weakness needing a precondition.
- **Medium**: Degraded behavior, workaround exists.
- **Low**: Cosmetic, cleanup, minor debt.

---

## Register

| ID | Chunk | Subsystem | Files and symbols | Evidence | Classification | Severity | Status | Verification | Dependencies | Suggested priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| F-001 | C0.0 | Desktop Tooling | `bcams-desktop/package.json#L11` (`lint` script) | `[read]` `npm run lint` fails because ESLint v9 is installed but no `eslint.config.js` exists. | test gap | Low | partial | Static check (`npm run lint` exit code 2) | C2.1 | Medium |
| F-002 | C0.0 | Backend Version Control | `bcams-be` root | `[read]` `bcams-be` directory is not currently initialized as a git repository (`.git` absent). | documentation gap | Low | partial | Static check (`git status` exits with code 128) | C1.0 | Medium |
