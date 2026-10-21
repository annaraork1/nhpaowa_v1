# Plan: 027 School Bus Management

**Branch**: `027-school-bus-management` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

## Constitution Check

| Principle | Status |
|-----------|--------|
| §2.1 Modular service | PASS — `services/bus-service` |
| §2.2 Stack | PASS — Express/Prisma/React/JS |
| §2.3 Spec-driven | PASS — this folder |
| §2.4 Shared roles | PASS — `schoolBus` (gate/reports) + `schoolBusAdmin` (registry/slots) |
| §2.5 Append-only trips | PASS — GateTransaction no update |
| §2.6 Shared notifications | PASS — emit to `alerts` |
| §2.7 association_id | PASS |

## Technical Context

- Port `BUS_PORT=4002`, base path `/api/bus`
- Prisma schema `bus_tracking`; AlertType enum extended in inventory `public` for shared bell
- Web module `apps/web/src/modules/bus`

## Phases

1. Auth + SDD (done in repo)
2. Service scaffold + models + seed
3. Registry/gate/reports APIs + jobs
4. Web UI + proxy + docs
5. **RBAC split (2026-09-24)**: Security Staff → gate + reports view; registry/slots → `schoolBusAdmin` for Superadmin/Secretary/Estate Manager/Security Head
