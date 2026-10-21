# Contract: Attendance API

Resource `attendance`: SUPERADMIN/SECRETARY createEdit; TREASURER/COMMITTEE view; STAFF createEdit (self later).

- `GET/POST /staff`, `PATCH/DELETE /staff/:id` — optional `photoUrl` on create/patch (`026`)
- `POST /staff/photo` — multipart image upload → `{ url }` (`026`)
- `GET /attendance?from=&to=&staffId=`
- `POST /attendance/check-in` `{ staffId, at?, note? }` — one open punch; one completed shift per calendar day (`016`)
- `POST /attendance/:id/check-out` `{ at?, note? }` — min 30s after check-in
- `GET /attendance/day-state?date=`
- `POST /attendance/mark-absent` / `POST /attendance/clear-absent`
- `GET /attendance/export.csv?from=&to=`
