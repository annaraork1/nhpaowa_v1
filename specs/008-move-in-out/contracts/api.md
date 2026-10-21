# Contract: Moves API

Resource `moves`: SUPERADMIN/SECRETARY createEdit; STAFF view (today); COMMITTEE view.

- `GET /moves?status=&type=&date=` (includes `destinationFlat` when present)
- `POST /moves`
  - body: `flatId`, `type` (`MOVE_IN`|`MOVE_OUT`|`INTERNAL_SHIFT`), `partyType`, `scheduledDate`, contact fields, optional `destinationFlatId` (**required** for INTERNAL_SHIFT)
- `POST /moves/:id/approve|reject|start|complete|cancel`
- Completing INTERNAL_SHIFT transfers APPROVED parking allotments, vehicles, pets, emergency contacts, and access devices to destination (PENDING/REJECTED stay on origin)
- `GET /moves?date=today` for gate list — filters `scheduledDate` to association calendar today (`ASSOCIATION_TZ`, default Asia/Kolkata) and status ∈ {APPROVED, IN_PROGRESS} unless `status=` is also passed
- `GET /moves/:id/pdf` — PDF gate pass / authorization (letterhead + logo + president signature). Allowed only when status ∈ {APPROVED, IN_PROGRESS, COMPLETED}. Permission: `moves` view.
- `GET /moves/:id` — full details: flat(s), handover, statusEvents (asc), attachments (active)
- `POST /moves/:id/attachments` — multipart `file` (+ optional `label`); createEdit; image or PDF
- `DELETE /moves/:id/attachments/:attachmentId` — soft-delete; createEdit
