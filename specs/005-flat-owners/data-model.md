# Data Model: Flat Owners

## Flat
- id, associationId, **tower** (tower number), flatNumber, floor?
- **apartmentType** (1.5 BHK | 2 BHK | 3 BHK)
- **configuration** (Standard Variant | Compact | Optima | Ultima | Elite)
- **superBuiltUpArea** (sq.ft.; catalog-driven)
- parkingSlots (int), occupancyStatus (OWNER_OCCUPIED|TENANT_OCCUPIED|VACANT), notes?, deletedAt?, timestamps
- @@unique([associationId, tower, flatNumber])

## Apartment catalog (NHPAOWA)

| Type | Configuration | Super built-up |
|------|---------------|----------------|
| 1.5 BHK | Standard Variant | ~500–600 (stored 550) |
| 2 BHK | Compact | 708 |
| 2 BHK | Optima | 814 |
| 2 BHK | Ultima | 966 |
| 2 BHK | Elite | 1,163 |
| 3 BHK | Standard Variant | 1,286 |

Source of truth: `@nhpaowa/shared-ui` `APARTMENT_CATALOG` + `GET /api/association/apartment-catalog`.

## Tower registry (022)

- Active towers **1–16, 21–35**; **17–20** excluded (Riva).
- Floor groups G+14 / G+12 / G+10; DB floor `0` = Ground (display **G**).
- One Category per tower → fixed apartment variant; 4 flats/floor; 19 missing flat numbers.
- Seed: `generateNhpaowaFlatSeeds()` → **1,705** flats. See `022-tower-registry-seed`.

## FlatMember
- id, flatId, role (PRIMARY_OWNER|ASSOCIATE_OWNER|TENANT), name, phone, email?, userId?, isActive, deletedAt?, timestamps
- At most one active PRIMARY_OWNER per flat (enforced in service)

## OccupancyStatus / MemberRole
String enums in app layer (Prisma String fields).
