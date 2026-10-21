# API Contract

Base `/api/association` — permission `flatOwners`.

## Parking
- `GET /parking-slots?flatId=&unallotted=`
- `POST /parking-slots` `{ label, slotType, flatId? }`
- `PATCH /parking-slots/:id` allot/unallot/edit
- `DELETE /parking-slots/:id` soft-delete

## Vehicles
- `GET /flats/:flatId/vehicles?includePending=`
- `POST /flats/:flatId/vehicles`
- `PATCH /vehicles/:id`
- `DELETE /vehicles/:id`
- `POST /vehicles/:id/rc` multipart `file`
- `POST /vehicles/:id/approve` | `/reject` `{ reason }`

## Pets / Emergency / Access
- Same pattern under `/flats/:flatId/pets`, `/emergency-contacts`, `/access-devices`
- Approve/reject endpoints for PENDING

Resident POST forces `approvalStatus=PENDING` and requires FlatMember.userId === req.user.id.
Admin POST defaults `APPROVED`.

## Association pending queue
- `GET /household-pending` — all PENDING vehicles/pets/contacts/devices for the association (staff only), each row includes `flat`
