# Research: Flat Vehicles, Pets & Parking (extends 005)

**Date**: 2026-09-21  
**Status**: Clarified & implemented (Q1=B, Q2=A, Q3=B, Q4=B, Q5=A+C)  
**Parent**: [005-flat-owners](../005-flat-owners/spec.md)

## Current gap

`Flat` only stores `parkingSlots` (count). No vehicle register, no pet register, no named parking bay/slot inventory. Gate stickers, RFID, and pet policy compliance are not modelled.

## What Indian RWAs / apartment associations typically collect

### Vehicles
- Registration number (KA-…), type (4W / 2W / EV), make/model/colour
- Owner vs tenant vehicle; linked flat
- Parking sticker / RFID / label number + issued/returned status
- Optional RC copy on file
- Used for boom barrier, visitor vs resident gate, towing disputes

### Parking
- Allotted slot identity (basement/stilt/open + bay/slot number)
- Count of entitled slots vs actually allotted (already have count on Flat)
- Link vehicle ↔ slot (1 vehicle per assigned slot is common)
- Extra vehicle charges / waitlist (often later / dues module)

### Pets
- Species, name, breed, gender, colour/mark, microchip/tag
- Vaccination (esp. rabies) with validity dates
- Photo / registration number for society pet policy
- Owner declaration / nuisance responsibility (policy text, not always software)

### Often collected on the same “resident information” form (candidates)
| Capability | Why societies want it | Suggested phase |
|------------|----------------------|-----------------|
| Emergency contacts | Fire/medical/unit access when resident unreachable | Strong v1 candidate |
| Access devices (fob, RFID tag, remote, intercom code) | Gate accountability; revoke on move-out | Strong v1/v1.5 |
| Domestic help / drivers (name + ID) | Gate entry lists | Later |
| EV charging bay assignment | Growing need | Later |
| Visitor vehicle patterns | Security | Later / moves module |
| Unit insurance declaration | HOA risk | Later |
| Bike/cycle storage cage | Amenities | Later |

## Proposed entities (subject to Q&A)

- **ParkingSlot** — association + label (e.g. `B1-A-12`), type (COVERED/OPEN/STILT), optional `flatId` allotment
- **FlatVehicle** — flat + regNo + type + make/model/colour + sticker/RFID + optional `parkingSlotId`
- **FlatPet** — flat + species + name + breed + vaccine fields + notes
- Optional **FlatEmergencyContact**, **FlatAccessDevice**

## Explicitly out of scope until chosen
- RFID hardware / boom integration
- Automatic parking fee billing
- Breed ban enforcement engine
- Resident self-service portal (unless Q5 chooses it)

## Next

Answer clarification questions → `/speckit-specify` (or update 005) → plan → tasks → implement in loop.
