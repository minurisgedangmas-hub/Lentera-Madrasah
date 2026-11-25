# Security Specification & Payload-First Security TDD — Lentera Madrasah

## 1. Data Invariants
1. **Identity & Privilege Invariant**: A non-admin user (`request.auth.token.email != 'hagoyalitu@gmail.com'`) cannot self-assign `admin` or `guru` on `users/{userId}` creation unless matching a trusted `roleInvites` entry, and can never escalate `role`, `linkedStudentIds`, or `classIds` via `update`. Only verified Admins can create or update `/madrasahProfile/main`.
2. **PII Isolation Invariant**: `users/{userId}` (containing `email`) is readable only by the document owner (`uid == userId`) or Admin. Public names and roles live in `publicProfiles/{userId}`. Institutional madrasah metadata (`madrasahProfile/main`) contains no personal PII.
3. **Referential Integrity Invariant**: Every `Grade` and `Attendance` record must reference an existing `/students/{studentId}` document and carry an immutable `teacherUid` matching `request.auth.uid` on creation.
4. **Temporal & Volumetric Invariant**: Every `create` requires `createdAt == request.time && updatedAt == request.time`, every `update` preserves `createdAt` and sets `updatedAt == request.time`, and every string/array field enforces strict `.size()` bounds.
5. **Query Security Invariant**: Every `allow list` rule evaluates `resource.data` directly against `request.auth.uid` or `isTokenAdmin()` with zero `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Payloads (Adversarial Security Test Cases)
1. **Self-Assigned Admin Escalation**: Non-admin creates `users/attacker` with `{ "role": "admin" }`. -> **MUST DENY**.
2. **Role Tampering on Update**: Student updates `users/student1` changing `role` from `"siswa"` to `"guru"`. -> **MUST DENY**.
3. **Shadow Ghost Field Injection**: Teacher creates `grades/g1` with extra field `{ "isVerified": true }`. -> **MUST DENY**.
4. **Email Spoofing (Unverified Email)**: User with `email: "hagoyalitu@gmail.com"` and `email_verified: false` tries to write `announcements/a1`. -> **MUST DENY**.
5. **PII Blanket Read**: Signed-in student tries `get` on `users/other_parent_uid` to read parent email. -> **MUST DENY**.
6. **Student Grade Forgery**: Signed-in student tries to create `grades/g2` for themselves with `score: 100`. -> **MUST DENY**.
7. **Orphaned Grade Injection**: Teacher tries to create `grades/g3` referencing nonexistent `studentId: "ghost_student"`. -> **MUST DENY**.
8. **Score Out-of-Bounds / Type Poisoning**: Teacher tries to create `grades/g4` with `score: 999` or `score: "A+"`. -> **MUST DENY**.
9. **Path ID Poisoning**: User tries to write `announcements/` with a 200-char ID or invalid characters `../admin`. -> **MUST DENY**.
10. **Client Timestamp Spoofing**: Teacher creates `attendance/att1` with a backdated `createdAt` instead of `request.time`. -> **MUST DENY**.
11. **Teacher Spoofing Another Teacher**: Teacher A tries to update `grades/g_teacher_b` created by Teacher B. -> **MUST DENY**.
12. **Unbounded Array / Resource Exhaustion**: User tries to create `students/s1` with 50 entries in `parentUids` or a 10KB `fullName`. -> **MUST DENY**.
