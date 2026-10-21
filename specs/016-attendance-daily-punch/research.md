# Research: Daily Punch Rules & Mark Absent

## Decision 1 — One completed shift per calendar day

**Choice**: After a closed check-in/out whose `checkInAt` falls on today’s association calendar day, further check-ins that day are rejected.  
**Rationale**: Matches paper gate registers (one Time-In / Time-Out row per staff per day) and matches user report that re-check-in after checkout is wrong.  
**Rejected**: Unlimited intervals per day (allowed multi-shift but caused ops confusion).

## Decision 2 — Minimum 30s punch dwell

**Choice**: Reject check-out when `checkOutAt - checkInAt < 30_000` ms (honouring optional `at` correction timestamps).  
**Rationale**: UI swaps Check in → Check out in the same control slot; double-clicks closed punches in &lt;1s in reproduction. Server guard is the hard backstop; UI disable-while-pending is the soft fix.  
**Rejected**: Client-only debounce (bypassable).

## Decision 3 — Explicit Absent marks

**Choice**: Persist `AttendanceDayMark` (staff + date + status ABSENT + note). Derived ABSENT remains when unmarked and no punch/leave.  
**Rationale**: Research (daily attendance sheets) distinguishes Present / Absent / Leave as explicit statuses; Secretaries need to confirm no-shows before end of day, not only rely on “no punch yet”.  
**Rejected**: Reusing StaffLeave for absence (wrong semantics); sentinel AttendanceEntry with null times (schema requires checkInAt).

## Decision 4 — Leave beats Absent mark; punch blocks mark

**Choice**: ON_LEAVE if approved leave covers the day; else PRESENT if any punch; else ABSENT if mark or derived. Writes: cannot mark absent if leave or punch exists.  
**Rationale**: Same precedence as 012 with an explicit mark layer.
