# Plan: 026 Staff Photo on Check-in Roster

**Branch**: `026-staff-photo-roster` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)  
**Status**: Implemented (retroactive SDD)

## Technical Context

| Area | Choice |
|------|--------|
| Stack | Prisma `AssociationStaff.photoUrl`; Express multer under `uploads/staff`; React AttendancePage |
| Permissions | `attendance` createEdit for upload + mutate; view for roster display |
| Media | Disk files via existing `/uploads` static; client `mediaUrl()` |
| UI | Desktop table avatar + mobile `EntityCard` `avatar`; preview dialog; camera badge for change |

## Constitution Check

- Association calendar / punch rules unchanged.
- No secrets in client; auth via Bearer as existing association routes.
- Soft-fail: missing photo → initials, not errors.

## Implementation (done)

1. Schema `photoUrl` + `db push` / generate.
2. `POST /staff/photo` + `photoUrl` on create/patch in `association.js`.
3. Client `api.association.staff.uploadPhoto`.
4. AttendancePage: Add staff photo field; roster avatars; view vs change UX.
5. `EntityCard` optional `avatar` prop.
6. Cross-link 007 data-model / contracts / roadmap.

## Artifacts

- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [contracts/api.md](./contracts/api.md)
- [quickstart.md](./quickstart.md)
- [tasks.md](./tasks.md)
