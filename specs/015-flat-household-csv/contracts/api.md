# API Contract: Flat & Household CSV

## Columns (header order)

```text
tower,flatNumber,floor,apartmentType,configuration,superBuiltUpArea,occupancyStatus,parkingSlots,notes,
primaryOwnerName,primaryOwnerPhone,primaryOwnerEmail,
members,parkingAllotted,vehicles,pets,emergencyContacts,accessDevices
```

### Multi-value encoding

- **Multiple entries in one cell**: separate records with `|` (pipe).
- **Fields inside one record**: separate with `:` (colon).
- Quote the whole cell in Excel if it contains commas; keep `|` / `:` unquoted inside the cell.
- Leave a multi-value cell **blank** to leave existing household data unchanged.

| Column | Pattern | Allowed tokens / notes | Sample (multi) |
|--------|---------|------------------------|----------------|
| `occupancyStatus` | single | `OWNER_OCCUPIED` \| `TENANT_OCCUPIED` \| `VACANT` | `OWNER_OCCUPIED` |
| `members` | `ROLE:name:phone:email` × N | ROLE = `ASSOCIATE_OWNER` \| `TENANT` (primary uses dedicated columns) | `ASSOCIATE_OWNER:Anita:9876500002:\|TENANT:Ramesh:9876500003:r@ex.com` |
| `parkingAllotted` | `label` × N | Must be unique campus labels | `B1-101\|B1-102` |
| `vehicles` | `TYPE:registrationNo:make:model:color:stickerNo` × N | TYPE = `FOUR_WHEELER` \| `TWO_WHEELER` \| `EV` \| `OTHER` | `FOUR_WHEELER:KA01AB1234:Hyundai:Creta:White:STK-1\|TWO_WHEELER:KA01XY9999:Honda:Activa:Grey:` |
| `pets` | `species:name:breed:rabiesYYYY-MM-DD` × N | Dates ISO | `Dog:Bruno:Labrador:2027-06-01\|Cat:Mimi:Persian:` |
| `emergencyContacts` | `name:phone:relationship:Y\|N` × N | Last field primary flag | `Priya:9876500099:Spouse:Y\|Raj:9876500088:Brother:N` |
| `accessDevices` | `TYPE:identifier:STATUS` × N | TYPE = `FOB`\|`RFID_TAG`\|`REMOTE`\|`STICKER`\|`OTHER`; STATUS = `ACTIVE`\|`RETURNED`\|`LOST` | `FOB:FOB-T1-101:ACTIVE\|STICKER:STK-88:ACTIVE` |

### Template structure

1. Header row (exact column names).
2. `#HELP` row — `tower` cell is `#HELP`; other cells hold short format/sample text. **Skipped on import.**
3. One or more sample data rows (may be deleted before real import).

## Endpoints

### `GET /association/flats/csv-template`

- Permission: `flatOwners` createEdit (staff)
- Returns CSV text (headers + `#HELP` + samples)

### `GET /association/flats/csv-guide`

- Permission: `flatOwners` createEdit (staff)
- Returns JSON: `{ multiValueRule, columns: [{ key, label, required, allowed, pattern, sample, tip }] }`

### `POST /association/flats/import-csv`

- Permission: `flatOwners` createEdit (staff editors only)
- Body: `{ csv: string }`
- Response: `{ created, updated, skipped, errors: [{ row, message }] }`
- Rows with `tower` starting with `#` are skipped (not counted as errors).

### `GET /association/flats/export.csv`

- Permission: `flatOwners` view; **403** for RESIDENT
- Same headers as template; household fields populated for APPROVED (and allotted) data
