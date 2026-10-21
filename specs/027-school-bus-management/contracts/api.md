# Contract: Bus API

Base: `/api/bus` — JWT.

### Resources
| Resource | Used for |
|----------|----------|
| `schoolBus` | Gate, live/today, trips IN/OUT, reports, resident today |
| `schoolBusAdmin` | Schools, buses, batches, slots, settings, registry CSV/PDF |

### Default roles
| Role | schoolBus | schoolBusAdmin |
|------|-----------|----------------|
| SUPERADMIN / SECRETARY / ESTATE_MANAGER / SECURITY_HEAD | view + createEdit | view + createEdit |
| SECURITY_STAFF | view + createEdit | none |
| TREASURER / COMMITTEE | view | none |
| RESIDENT | view | none |

## Registry (`schoolBusAdmin`)
- `GET/POST /schools`, `PATCH /schools/:id`
- `GET/POST /buses`, `PATCH /buses/:id`
- Schools/buses CSV template, export, import; `GET /registry/export.pdf`
- `GET/POST /batches`, `PATCH /batches/:id`
- `GET/POST /slots`, `PATCH /slots/:id`, `DELETE /slots/:id`
- `GET/PATCH /settings`

## Gate (`schoolBus`)
- `GET /gate/today?direction=PICKUP|DROPOFF`
- `GET /gate/live`
- `POST /trips/in` `{ busId, tripDirection, childCount?, notes? }` — createEdit; **DROPOFF requires childCount**; PICKUP omits (placeholder 0 until OUT)
- `POST /trips/:id/out` `{ childCount?, notes? }` — createEdit; **PICKUP requires childCount**; DROPOFF omits (keeps IN count)

## Resident (`schoolBus` view)
- `GET /resident/today` — sanitized schedule/status

## Reports (`schoolBus` view)
- `GET /reports/daily-trips?date=&format=json|csv|pdf`
- `GET /reports/reconciliation?date=&format=csv|json`
- `GET /reports/wait-times?date=&format=csv|json`
- `GET /reports/congestion?date=&format=csv|json`
