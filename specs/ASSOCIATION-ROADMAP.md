# Association Operations Roadmap (NHPAOWA)

Research-backed modules for Secretary / Committee operations beyond Inventory.
Each feature has its own Spec Kit directory so it can ship and extend independently.

## Dependency order

```text
005-flat-owners          ← master register of units + members
        ↓
008-move-in-out          ← occupancy lifecycle (in/out + internal shift; needs flats/owners)
        ↓
006-noc-certificates     ← NOC / no-dues letters (needs flats + dues/occupancy context)
007-staff-attendance     ← parallel; uses Staff users / staff roster
011-staff-csv-roster     ← extends 007: CSV import + tower/post categories
012-attendance-history-leave ← extends 007/011: history muster, leave, payroll-ready CSV
009-resident-notices     ← parallel; association circulars published as PDF
010-board-office-bearers ← Superadmin MC/office-bearer register (feeds letterheads)
013-flat-vehicles-pets-parking ← household register + resident PENDING submit
014-resident-portal      ← sample tower resident login + scoped self-service shell
015-flat-household-csv   ← flats + household CSV import/export (extends 005/013)
016-attendance-daily-punch ← one shift/day, anti-accidental checkout, mark absent (extends 007/012)
021-attendance-punch-detail ← In / Out / Hours on roster + history
026-staff-photo-roster ← optional face photos on Add staff + check-in roster (view vs change)
027-school-bus-management ← school bus registry, batches/slots, gate IN/OUT, alerts, reports
028-flat-self-update-link ← login-free QR/form + PENDING approve + collection % (extends 005/013/015)
```


## Research summary (India RWA / housing society)

| Capability | Typical need |
|------------|----------------|
| **Flat owners / members** | Membership register (Form-I style): flat/wing, primary + associate members, contact, parking, status (owner-occupied / tenant / vacant) |
| **Flat vehicles / pets / parking** | Per-flat vehicle + pet register and named parking allotments (extends 005; see `013-flat-vehicles-pets-parking`) |
| **NOC** | Society letter for **sale / transfer**, **bank loan / mortgage**, **rental / tenant**, **renovation**, sometimes passport/domicile; usually needs **no dues** statement + Secretary/Chairman sign-off |
| **Move-in / move-out / internal shift** | Gate pass, lift notes, handover meters/keys; **internal shift** when a resident relocates between flats in the same society (~1705 units) |
| **Staff attendance** | Security / housekeeping / maintenance roster with shift check-in/out for payroll & gate accountability |
| **Staff photos** | Optional face thumbnails on Add staff + check-in roster for recognition (`026-staff-photo-roster`) |
| **School buses** | Recurring school bus registry, gate batches/slots, IN/OUT log, congestion alerts & reports (`027-school-bus-management`) |
| **Staff CSV roster** | Bulk import of multi-tower posts: gate & lobby security, gardening, electrician, plumber, clubhouse desk, office; **managed staff categories** (add/edit in Attendance) |
| **Attendance history & leave** | Daily Present / Absent / On Leave muster, leave register, today KPIs, payroll-ready facts CSV (salary/PF/ESI later) |
| **Resident notices** | Official circulars (security, compliance, general) drafted by Secretary, published as PDF for all residents |
| **Board / office bearers** | Managing Committee register (President, Secretary, Treasurer, VP, Joint Secretary, Estate Manager, members) maintained by Superadmin; drives PDF letterheads |

**Out of scope for these v1 specs (extend later):** full dues ledger, e-sign PDF stamps, police verification portals, builder→RWA HOTO asset packs (separate program), NBH notice sync, per-flat notice targeting, per-president signature image upload, biometric attendance devices, salary/PF/ESI payroll calculation (012 exports facts only).

## Campus calendar convention

All “today” / date-only filters (moves gate list, attendance KPIs/history/leave, report default ranges) use **Asia/Kolkata** via `@nhpaowa/shared-ui` `associationCalendarYmd` (env `ASSOCIATION_TZ`). Do **not** use `Date#toDateString()` or UTC `toISOString().slice(0,10)` for campus calendar days — they skew `@db.Date` matches around IST midnight.

## Roles (platform)

- **Superadmin / Secretary**: full CRUD on registers, issue/approve NOC, manage move requests, attendance admin; **Superadmin** maintains board/office-bearer roles & members
- **Treasurer / Committee**: view + approve where dues/no-dues is involved (NOC)
- **Staff**: attendance self check-in (optional) + view assigned moves
- **Resident**: self-service for **linked** flats (see `014-resident-portal`): view notices; submit household updates (PENDING); request NOC and moves for own flat; no inventory / attendance / board admin

## Spec directories

- [005-flat-owners](./005-flat-owners/)
- [006-noc-certificates](./006-noc-certificates/)
- [007-staff-attendance](./007-staff-attendance/)
- [008-move-in-out](./008-move-in-out/)
- [009-resident-notices](./009-resident-notices/)
- [010-board-office-bearers](./010-board-office-bearers/)
- [011-staff-csv-roster](./011-staff-csv-roster/)
- [012-attendance-history-leave](./012-attendance-history-leave/)
- [013-flat-vehicles-pets-parking](./013-flat-vehicles-pets-parking/)
- [014-resident-portal](./014-resident-portal/)
- [015-flat-household-csv](./015-flat-household-csv/)
- [016-attendance-daily-punch](./016-attendance-daily-punch/)
- [021-attendance-punch-detail](./021-attendance-punch-detail/)
- [026-staff-photo-roster](./026-staff-photo-roster/)
- [027-school-bus-management](./027-school-bus-management/)
- [028-flat-self-update-link](./028-flat-self-update-link/)
