# Data Model

## ParkingSlot
- id, associationId, label (unique per association), slotType (COVERED|OPEN|STILT|OTHER)
- flatId nullable, active, deletedAt, timestamps

## FlatVehicle
- id, flatId, vehicleType (FOUR_WHEELER|TWO_WHEELER|EV|OTHER)
- registrationNo, make, model, color, stickerNo, rfidTag
- parkingSlotId nullable, rcFileUrl nullable, notes
- approvalStatus (PENDING|APPROVED|REJECTED), rejectionReason, submittedByUserId
- deletedAt, timestamps

## FlatPet
- id, flatId, species, name, breed, gender, notes
- rabiesValidTill (date), vaccinationNotes
- approvalStatus, rejectionReason, submittedByUserId, deletedAt, timestamps

## FlatEmergencyContact
- id, flatId, name, phone, relationship, isPrimary
- approvalStatus, rejectionReason, submittedByUserId, deletedAt, timestamps

## FlatAccessDevice
- id, flatId, deviceType (FOB|RFID_TAG|REMOTE|STICKER|OTHER)
- identifier, status (ACTIVE|RETURNED|LOST), issuedAt, returnedAt, notes
- approvalStatus, rejectionReason, submittedByUserId, deletedAt, timestamps

## Flat (existing)
- Keep parkingSlots count; add relations to slots/vehicles/pets/contacts/devices
