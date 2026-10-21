# Research: 028 Flat Self-Update Link

## Decision: Tower number lookup (not separate tower + flat)

Residents know the full unit code as **tower number** (e.g. `21031` / `T21031`). Separate tower vs flat fields caused entry errors. Internally this still parses to `tower` + `flatNumber` via `parseCampusFlatQuery`.

## Decision: No phone last-4 in v1

Phones are often missing until the drive completes. Lookup by tower number alone; staff approve PENDING rows. OTP can be added later without changing submit/approve.

## Decision: PENDING self-update table (not direct write)

Staff remain system of record. Aligns with 013 household PENDING pattern.

## Decision: Phased collectionPhase on Flat

SEED → P1_VERIFIED → P2_HOUSEHOLD gives tower chase lists without parsing household tables every time. Public form covers P1; household uses Flats / CSV / paper.

## Decision: Single association public form

NHPAOWA is one society; ASSOCIATION_ID from env. Multi-tenant public URLs later.
