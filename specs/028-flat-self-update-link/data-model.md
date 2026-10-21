# Data Model: 028

## Flat (extend)

- `collectionPhase` String default `SEED` — `SEED` | `P1_VERIFIED` | `P2_HOUSEHOLD`

## FlatUpdateSession

- id, associationId, flatId, token (unique), expiresAt, createdAt
- Created on successful verify by **tower number** (`21031` / `T21031` → tower + flatNumber); deleted/ignored after expiry or after submit

## FlatSelfUpdate

- id, associationId, flatId
- phase: `P1` | `P2`
- payload Json (`occupancyStatus`, `primaryName`, `primaryPhone`, `secondaryName?`, `secondaryPhone?`, `tenantName?`, `tenantPhone?`, `notes?`)
- status: `PENDING` | `APPROVED` | `REJECTED`
- rejectionReason?
- phoneLast4Used String (audit; may be from submitted primary phone, not a verify gate)
- createdAt, reviewedAt?, reviewedByUserId?
