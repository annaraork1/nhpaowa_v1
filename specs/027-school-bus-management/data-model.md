# Data Model: bus_tracking

## School
associationId, name, primaryContactName, primaryContactPhone, address?, active, deletedAt?

## Bus
associationId, schoolId, vehicleRegistrationNumber (unique per assoc), driverName, driverPhone, conductorName?, conductorPhone?, seatingCapacity?, active, deletedAt?

## GateBatch
associationId, label, startTime (time), endTime (time), bayCapacity (default 3), tripDirection (PICKUP|DROPOFF), active, deletedAt?

## BusSlot
associationId, busId, batchId, assignedTime (time), staggerOrder (int)

## GateTransaction (append-only)
associationId, busId, tripDate (date), tripDirection, gateInAt, gateOutAt?, childCount, loggedByUserId?, notes?, correctsTransactionId?, createdAt  
**Child count once:** set on DROPOFF IN or PICKUP OUT (single `childCount` field).  
**No updatedAt / no PATCH of core fields** (except filling `gateOutAt` / PICKUP `childCount` on OUT completion).

## BusSetting
associationId (unique), longWaitMinutes (5), offSlotBufferMinutes (5), unmatchedCutoffTime (time, default 20:00)
