# Implementation Plan: Staff Attendance

**Branch**: `007-staff-attendance` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

## Summary

Staff roster + check-in/out registry + CSV export. Resource `attendance`.

## Constitution Check

PASS — attendance entries append-only preferred; corrections via note/audit field.

## Structure

```text
AssociationStaff, AttendanceEntry models
routes/association/attendance.js
pages/AttendancePage.jsx, StaffRosterPage.jsx (or combined)
```
