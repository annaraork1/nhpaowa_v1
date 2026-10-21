# Contract: Board API

Resource `board`:

| Role | Actions |
|------|---------|
| SUPERADMIN | view, createEdit, delete |
| SECRETARY | view |
| Others | none |

Base: `/api/association/board`

### Roles

- `GET /board/roles` — list (includeInactive query)
- `POST /board/roles` — create (createEdit)
- `PATCH /board/roles/:id` — update
- `DELETE /board/roles/:id` — soft deactivate

### Members

- `GET /board/members?roleId=&q=&active=`
- `GET /board/letterhead` — active letterhead payload `{ members: [{role,name}], president: {name,role} }` (any role with `board.view`, also used by PDF/print)
- `POST /board/members`
- `PATCH /board/members/:id`
- `DELETE /board/members/:id` — soft deactivate
