# Implementation Plan: Move-In / Move-Out / Internal Shift

**Branch**: `008-move-in-out` | **Date**: 2026-09-20 | **Updated**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

## Summary

Move requests + handover completion updating flat occupancy; internal shift transfers members + APPROVED household; searchable flat pickers; **approved-move PDF gate pass** with NHPAOWA letterhead for resident/Security sharing. Resource `moves`. Depends on flats + board letterhead (010).

## Constitution Check

PASS — status event audit; soft cancel; no builder HOTO in scope; PDF reuses association brand helpers (no duplicate logo stack).

## Structure

```text
MoveRequest, MoveHandover, MoveStatusEvent
lib/movePdf.js
MoveAttachment model + /uploads/moves
GET /moves/:id (history + attachments)
POST/DELETE /moves/:id/attachments
pages/MovesPage.jsx — Details panel
```

## PDF design

- On-demand stream (no stored file) so letterhead/board stay current
- Doc titles: MOVE-IN AUTHORIZATION | MOVE-OUT AUTHORIZATION | INTERNAL SHIFT AUTHORIZATION
- Body: reference id, status, flats, party, schedule, contact, mover notes, security instruction line
- Footer signature: President (from board register / fallback)
