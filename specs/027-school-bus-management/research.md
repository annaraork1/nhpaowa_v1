# Research: 027 School Bus

## Decision: New bus-service (not inventory module)

Constitution §2.1 — independent deployable service + `bus_tracking` schema.

## Decision: Shared alerts via inventory AlertType + raw/shared emit

Bell UI already reads inventory `/api/inventory/alerts`. Extend `AlertType` enum; bus-service inserts via Prisma client that maps `Alert` in `public` or `$executeRaw` after enum push.

## Decision: Direction never inferred from clock

Paper gaps included ambiguous direction; mandatory PICKUP/DROPOFF toggle.

## Decision: Resident payload sanitized

Hide childCount and driver/conductor phones on `/resident/today`.

## Decision: Single child count (PICKUP@OUT, DROP-OFF@IN)

Guards count children once per direction: when kids leave campus (PICKUP OUT) or arrive (DROP-OFF IN). Dual IN/OUT counts and mismatch verification were removed as incorrect for the paper-register use case.

Security Staff must operate the gate without maintaining the school/bus registry or slot map. A single `schoolBus` createEdit flag would also unlock Schools & Batches UI.

- `schoolBus` — gate IN/OUT + live/today + reports view + resident today
- `schoolBusAdmin` — schools/buses/batches/slots/settings + registry CSV/PDF

Default matrix: Security Staff gets `schoolBus` VIEW_EDIT only; Superadmin, Secretary, Estate Manager, Security Head get both; Treasurer/Committee get `schoolBus` VIEW only.
