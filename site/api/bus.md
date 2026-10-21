# Bus API

Base path: `/api/bus` (bus-service, port 4002). Data lives in the `bus_tracking` Postgres schema.

## Registry

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/schools` | List or add schools |
| PATCH | `/schools/:id` | Edit or deactivate a school |
| GET | `/schools/csv-template` · `/schools/export.csv` | CSV template and export |
| POST | `/schools/import` | Import schools from CSV |
| GET/POST | `/buses` | List or add buses |
| PATCH | `/buses/:id` | Edit or deactivate a bus |
| GET | `/buses/csv-template` · `/buses/export.csv` | CSV template and export |
| POST | `/buses/import` | Import buses from CSV |
| GET | `/registry/export.pdf` | Registry PDF |

## Batches, slots, settings

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/batches` | Pickup or drop-off batches with time window and bay capacity |
| PATCH | `/batches/:id` | Edit a batch |
| GET/POST | `/slots` | Bus slot assignments within a batch |
| PATCH/DELETE | `/slots/:id` | Edit or remove a slot |
| GET/PATCH | `/settings` | Long-wait minutes, off-slot buffer, unmatched-OUT cutoff |

## Gate

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/gate/today` | Today's roster and trips |
| GET | `/gate/live` | Buses inside and bay occupancy |
| POST | `/trips/in` | Log a bus entering |
| POST | `/trips/:id/out` | Log the bus leaving |

```http
POST /api/bus/trips/in

{ "busId": "…", "tripDirection": "DROPOFF", "childCount": 18 }
```

- `tripDirection` is `PICKUP` or `DROPOFF`.
- Drop-off requires `childCount` on **IN**; pickup requires it on **OUT**.
- A trip that's already out can't be changed. Log a new trip with `correctsTransactionId` instead.

## Reports

| Method | Path |
|--------|------|
| GET | `/reports/daily-trips` (CSV or PDF) |
| GET | `/reports/reconciliation` |
| GET | `/reports/wait-times` |
| GET | `/reports/congestion` |

## Residents

`GET /resident/today` returns today's schedule and bus status without child counts or driver contacts.
