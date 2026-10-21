# Implementation Plan: Staff CSV Roster

**Branch**: `011-staff-csv-roster` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

## Summary

Extend AssociationStaff with tower/designation; expand categories; add CSV template download + import endpoint; Attendance UI import control; research-based seed roster for NHPAOWA towers.

## Technical Context

**Stack**: Same as 007 (Express, Prisma, React)  
**CSV**: Simple parse (no heavy lib required) — header row + comma-split with quote handling for phones  

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Modular monorepo | PASS | `/api/association/staff/*` |
| Soft-delete | PASS | Existing staff soft flags |
| Spec-driven | PASS | This folder |

## Structure

```text
prisma/schema.prisma                 # tower, designation on AssociationStaff
routes/association.js                # categories, import, template
AttendancePage.jsx                   # Import CSV + fields
prisma/seed.js                       # expanded sample roster
```
