# Contract: Notices API

Resource `notices`:

| Role | Actions |
|------|---------|
| SUPERADMIN / SECRETARY | view, createEdit |
| TREASURER / COMMITTEE | view |
| RESIDENT | view (published only) |
| STAFF / VENDOR | none |

Base: `/api/association/notices`

- `GET /notices?status=&q=&category=` — admin sees all statuses; residents forced to PUBLISHED
- `GET /notices/:id` — detail; residents only if PUBLISHED
- `POST /notices` — create DRAFT (createEdit)
- `PATCH /notices/:id` — update draft fields while DRAFT or UNPUBLISHED (createEdit)
- `POST /notices/:id/publish` — → PUBLISHED, generate PDF, notify (createEdit)
- `POST /notices/:id/unpublish` — → UNPUBLISHED (createEdit)
- `POST /notices/:id/archive` — → ARCHIVED (createEdit)
- `GET /notices/:id/pdf` — stream PDF; residents only if PUBLISHED

PDF response: `application/pdf` with Content-Disposition attachment/inline.
