# Quickstart: Flat & Household CSV

## How to fill multiple members / vehicles / pets

One **row** = one flat. Put several household items in the **same cell**:

1. Separate each person/vehicle/pet with a **pipe** `|`
2. Inside each item, separate fields with a **colon** `:`

Example — two vehicles:

```text
FOUR_WHEELER:KA01AB1234:Hyundai:Creta:White:STK-1|TWO_WHEELER:KA01XY9999:Honda:Activa:Grey:
```

Example — associate + tenant (primary owner stays in `primaryOwner*` columns):

```text
ASSOCIATE_OWNER:Anita Sharma:9876500002:|TENANT:Ramesh:9876500003:ramesh@example.com
```

Leave a household column **empty** if you do not want to change existing data.

## Template / import (API)

```http
GET /api/association/flats/csv-template
GET /api/association/flats/csv-guide
POST /api/association/flats/import-csv
Content-Type: application/json
{ "csv": "<paste>" }
```

Template row 2 is `#HELP` (skipped on import). Hover column names in the Import panel for samples.

## UI

Flats page (Secretary) → **CSV template** / **Import CSV** / **Export CSV**.  
Import panel → column guide table (allowed values + samples).

## Smoke

1. Download template — confirm `#HELP` row and a multi-`|` vehicle sample.
2. Open Import — guide shows vehicles/members tips.
3. Export current register — household columns present for T1-101.
4. Import Tower 9 / 901 with two vehicles joined by `|` → both appear.
5. Re-import same tower/flat with new phone → updated, not duplicated.
6. Resident login cannot export/import/guide.
