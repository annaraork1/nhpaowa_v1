# Implementation Plan: Flat Vehicles, Pets, Parking & Household

**Branch**: `013-flat-vehicles-pets-parking` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

## Summary

Extend flat register with ParkingSlot inventory, FlatVehicle (+ RC upload), FlatPet, FlatEmergencyContact, FlatAccessDevice; approval workflow PENDING→APPROVED/REJECTED for resident submits; Secretary direct APPROVED. UI on Flats page household panel.

## Technical Context

**Stack**: Express + Prisma + multer uploads (same as inventory photos/notices)  
**Permissions**: `flatOwners` view/createEdit/delete; resident submit uses createEdit only when FlatMember.userId matches, forced PENDING  

## Constitution Check

| Gate | Status |
|------|--------|
| Modular association routes | PASS |
| Soft-delete | PASS |
| Spec-driven | PASS |

## Structure

```text
prisma/schema.prisma
src/routes/flatHousehold.js
apps/web/.../FlatsPage.jsx              # View household + Edit opens panel
apps/web/.../FlatHouseholdPanel.jsx     # CRUD tabs + vehicle edit
apps/web/.../FlatHouseholdViewSection.jsx  # read-only View snapshot
prisma/seed.js
```

## UX (US-6)

- **View**: wide dialog with flat core fields + household sections (APPROVED only).
- **Edit**: flat form + household panel (and “Edit household details” button); vehicle inline edit supported.
