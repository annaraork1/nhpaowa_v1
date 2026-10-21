# Contract: GET /api/association/flats

## Query parameters

| Param | Type | Notes |
|-------|------|-------|
| `q` | string | Debounced freetext; matches tower, flatNumber, type, configuration, members; also campus id `T{tower}{flat}` / `{tower}{flat}` |
| `tower` | string | Exact tower number |
| `floor` | integer | Exact floor (`0` = G) |
| `occupancyStatus` | enum | `OWNER_OCCUPIED` \| `TENANT_OCCUPIED` \| `VACANT` |
| `apartmentType` | string | Exact apartment type |
| `includeDeleted` | `true`\|omitted | Soft-deleted inclusion |

## Response

JSON array of Flat (+ active members), ordered by tower, flatNumber.

## Examples

- `GET /flats?q=T21031` → flat tower=`21`, flatNumber=`031`
- `GET /flats?tower=21&floor=3` → all unit flats on tower 21 floor 3
- `GET /flats?occupancyStatus=VACANT&apartmentType=2%20BHK`
