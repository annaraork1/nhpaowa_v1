# Data Model: Moves

## MoveRequest
- id, associationId
- flatId (origin)
- destinationFlatId? (required when type = INTERNAL_SHIFT)
- type (MOVE_IN | MOVE_OUT | INTERNAL_SHIFT)
- partyType (OWNER | TENANT), status, scheduledDate, contactName, contactPhone, moverNotes?, checklistJson, timestamps

## MoveHandover
- id, moveRequestId, electricityMeter?, waterMeter?, keysCount?, accessCardsCount?, parkingTagsCount?, notes?, completedAt

## MoveStatusEvent
- id, moveRequestId, fromStatus?, toStatus, actorUserId?, note?, createdAt

## MoveAttachment
- id, moveRequestId, label?, originalName, fileName, mimeType, url (public path under /uploads/moves), uploadedByUserId?, createdAt, deletedAt?

## Internal shift completion effects
- Origin Flat.occupancyStatus → VACANT
- Destination Flat.occupancyStatus → OWNER_OCCUPIED | TENANT_OCCUPIED
- Active FlatMembers on origin → flatId updated to destination
- APPROVED parking allotments, vehicles, pets, emergency contacts, access devices on origin → flatId updated to destination (PENDING/REJECTED stay on origin)
