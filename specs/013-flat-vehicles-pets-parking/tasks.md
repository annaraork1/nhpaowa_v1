# Tasks: 013 Flat Vehicles / Pets / Parking

- [x] T001 Prisma models + Flat relations; db push / generate
- [x] T002 Parking slot CRUD routes
- [x] T003 Vehicle CRUD + RC upload + approve/reject
- [x] T004 Pet, emergency contact, access device CRUD + approve/reject
- [x] T005 Client API methods
- [x] T006 FlatsPage household panel (tabs: Parking, Vehicles, Pets, Emergency, Access, Pending)
- [x] T007 Seed sample slots/vehicles/pets/contacts/devices
- [x] T008 Update roadmap + 005 cross-link; smoke checklist

## Phase 5: View / Edit household UX (spec US-6 / FR-010–011)

- [x] T009 Flat View dialog includes `FlatHouseholdViewSection` (APPROVED parking/vehicles/pets/contacts/devices)
- [x] T010 Flat Edit opens household panel + “Edit household details” control on flat form
- [x] T011 In-panel edit for existing vehicles (save via PATCH)
- [x] T012 In-panel edit for pets, emergency contacts, and access devices (parity with vehicles)
- [x] T013 UI advisory when allotted parking slots exceed flat `parkingSlots` entitlement
- [x] T014 Smoke US-6: View T1-101 shows seed household; Edit → change vehicle → View refreshed
- [x] T015 Sync 005 quickstart/spec note for View/Edit household path

## Quickstart smoke
1. Flats → **View** on T1-101 → see B1-101, KA01AB1234, Bruno, Priya, FOB  
2. **Edit** → household panel + Edit household details → change vehicle make → Save  
3. View again → updated make; Upload RC still works  
4. Pending tab for resident submissions  

## Phase 6: Association pending queue

- [x] T016 `GET /household-pending` association-wide; Flats page Pending approvals panel
- [x] T017 Seed one PENDING vehicle; staff approve/reject from queue; staff creates remain APPROVED
