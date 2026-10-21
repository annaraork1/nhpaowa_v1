# Staff Attendance

**Attendance** is the daily muster for association staff — security, housekeeping, gardening, electricians, clubhouse, and office — with leave tracking and payroll-ready exports.

<img class="screenshot" src="/screenshots/attendance.png" alt="Staff attendance roster" />

The summary cards show the active roster, who is present today, on leave, marked absent, and still checked in.

## Staff roster

Each staff member has a name, category, tower, post (designation), phone, an **Active** flag, and an optional photo.

- **Add staff** — fill the details and optionally take or upload a photo. Rows without a photo show initials.
- Tap a photo to view it larger; use the camera badge to change it.
- **Staff CSV template** and **Import staff CSV** bulk-load the roster.
- **Staff categories** — maintain categories such as Security post, Housekeeping, Gardening, Electrical, Plumbing, Clubhouse / amenities, Maintenance, Office.

Inactive staff disappear from the check-in roster but keep their history.

## Daily check-in and check-out

From the **Roster** tab:

1. **Check in** when the person arrives. The row shows **In · in 01:58 PM**.
2. **Check out** when they leave. The row then shows in time, out time, and hours worked.
3. **Mark absent** for a no-show.

The rules prevent common mistakes at a busy desk:

- One check-in and one check-out per person per day.
- Check-out is blocked for 30 seconds after check-in, so a double-tap can't close the shift instantly.
- After a completed shift, the person can't check in again the same day.

## Leave

The **Leave** tab records leave for a date range with a type — Casual, Sick, Earned, Week off, Unpaid, or Other. People on leave show as **On leave** in the muster instead of absent. Leave can be cancelled.

## History and payroll exports

The **History** tab shows each person's daily status (present, absent, on leave) with check-in, check-out, and hours.

| Export | Contents |
|--------|----------|
| **Export payroll CSV** | One row per person per day: category, tower, designation, status (present / absent / on leave), leave type, hours, check-in and check-out |
| **Export clock CSV** | Every punch with check-in and check-out timestamps, for audits and contractor billing |

## Mobile

Gate and desk staff usually punch from a phone. On narrow screens the roster becomes cards with large buttons.

<img class="screenshot mobile" src="/screenshots/mobile-attendance.png" alt="Attendance on a phone" />

## Who can do what

| Role | Access |
|------|--------|
| Superadmin, Secretary, Staff, Security Head, Security Staff | Punch, mark absent, record leave, manage roster |
| Treasurer, Committee, Estate Manager | View and export |
