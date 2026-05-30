# Security Specification - Durrat Al-Munawwarah Gate Management

This document defines the data validation invariants, malicious payloads, and rules for the Firestore database.

## 1. Data Invariants

1. **Buses (`/buses/{busId}`)**:
   - Must have a valid identifier (`busId`).
   - Must include `operatorNumber`, `plateNumber`, `driverName`, and `manufacturingYear`.
   - Admin (Director) has full write options. Verified Monitors has read-only access once approved.
   - Guard has read-only access.

2. **Movements (`/movements/{movementId}`)**:
   - Must have `busId`, `operatorNumber`, `plateNumber`, `type` (`IN` | `OUT`), `period` (`AM` | `PM`), `timestamp`, `guardId`, and `guardName`.
   - Guards can create movements.
   - Directors and Monitors can read movements.

3. **Guards (`/guards/{username}`)**:
   - Schema contains raw credential pairs (username, hashed/plain passwords) for local verification.
   - Only Directors can create, update, or delete guards.

4. **Monitors (`/monitors/{uid}`)**:
   - Created automatically upon Google login.
   - Contains `email`, `name`, `status` (`PENDING`, `APPROVED`, `REJECTED`), and `createdAt`.
   - Only Director can update the status of monitors.

5. **Settings (`/settings/{settingsId}`)**:
   - Only Director can write/update configuration settings.

## 2. Dirty Dozen Payloads (Abuse Scenarios)

1. **Self-Approval Spoofing**: Monitor writing a request with `"status": "APPROVED"` directly to bypass admin review.
2. **Ghost-Field Injection**: Adding `"isAdmin": true` to a bus details document.
3. **Guard Hijacking**: Guard account modifications or deletion triggered by non-admin or unauthorized client.
4. **Invalid Gate Movement**: Injecting dummy movement state with invalid operation types (e.g., `"type": "EXPLODE"`).
5. **PII Exposure / Security bypass**: Read requests by unapproved monitors to view secret guard credentials.
6. **Denial of Wallet**: Attempting to inject high volume values (e.g. 10MB string) inside text fields.
7. **Temporal forgery**: Overwriting `createdAt` or setting future date for `timestamp`.
8. **Relational orphaned record creation**: Creating a gate movement pointing to a non-existent bus `busId`.
9. **Settings Hijack**: Unauthorized user editing company configuration title or corporate logo.
10. **Admin escalation**: Registering with a fake Google token for admin-only privileges.
11. **Immortality breach**: Deleting or changing historical movement records to hide high-level logs.
12. **Double key write**: Attempting to write a movement with empty driver or plate fields.

## 3. Security Rules Drafting (DRAFT_firestore.rules)

We will implement standard Zero-Trust security rules with `request.auth != null` verification.
The rules will authorize operations based on the user's role (Super Admin/Director dynamically checked by email or document check, approved monitors, and verified guards).
