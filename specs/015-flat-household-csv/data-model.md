# Data Model: Flat & Household CSV

No new tables. Import/export maps to:

| CSV concept | Entity |
|-------------|--------|
| tower + flatNumber | Flat unique key |
| floor, apartmentType, configuration, parkingSlots, occupancyStatus, notes | Flat fields |
| primaryOwner* | FlatMember PRIMARY_OWNER |
| members | FlatMember ASSOCIATE_OWNER / TENANT |
| parkingAllotted | ParkingSlot labels allotted to flat |
| vehicles | FlatVehicle (APPROVED) |
| pets | FlatPet (APPROVED) |
| emergencyContacts | FlatEmergencyContact (APPROVED) |
| accessDevices | FlatAccessDevice (APPROVED) |

superBuiltUpArea on export is derived from catalog when possible; on import, catalog match fills area.
