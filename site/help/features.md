# Feature List

Everything the NHPAOWA Platform does, grouped by module. Each module links to its usage guide.

## Platform

- **Self-hosted** — runs on your own Windows or Linux server, or with Docker Compose
- **Open stack** — React, Node.js, PostgreSQL 17/18, Prisma
- **Three back-end services** — identity, inventory/association, and school bus, behind a single reverse proxy
- **REST API** for every screen, with JWT authentication ([API](/api/))
- **Progressive Web App** — install on Android, iPhone, or desktop ([Mobile & PWA](/usage/mobile))
- **Responsive** — every list becomes cards on a phone; no sideways scrolling
- **Light and dark themes**
- **Global search** across items, suppliers, and purchase orders
- **Notification bell** with severity-coded alerts
- **CSV and PDF exports** throughout, PDFs on the association letterhead
- **Expo mobile app** for storeroom item lookup and stock in/out

## Users, roles and security

- [Ten roles](/administration/roles): Superadmin, Secretary, Treasurer, Committee, Staff, Security Head, Estate Manager, Security Staff, Resident, Vendor
- One permission matrix enforced identically by the API and the menu
- **Per-role menu features** — Superadmin can switch modules on or off for Staff, Security Head, Estate Manager, and Security Staff
- [User administration](/administration/users) — create, edit, change role, reset password, deactivate
- Role-specific home pages for operations staff, residents, and vendors
- Passwords hashed with bcrypt; 7-day sign-in tokens
- Strict authentication mode for production

## Flat owners register

- Pre-loaded campus register: **31 towers, about 1,705 flats** (towers 1–16 and 21–35)
- Apartment type, floor, and occupancy (owner-occupied, tenant, vacant)
- Members per flat: primary owner, associate owner, tenant, owner family, tenant family — with phone and email
- Search by campus ID (`T21031`), owner or tenant name, phone, or email; filter by tower, floor, occupancy, and apartment type
- **Household records**: vehicles with RC upload, pets, parking slots with allotment letters, access devices (cards, tags), emergency contacts
- Resident-submitted household changes go through staff approval
- CSV template, guide, and **merge import** with conflict reporting
- Owner register export as CSV and PDF

[Flat owners guide →](/usage/flats)

## Flat self-update drive

- **Login-free form** — residents enter their campus flat number and confirm occupancy and owner/tenant contacts
- Five collection channels: public form, WhatsApp share link, printable paper form, clubhouse kiosk mode, and staff CSV import
- Per-flat prefilled links CSV for notice boards and tower captains
- Staff review queue — nothing reaches the register until approved
- Collection progress per tower (seed data vs. verified)

[Flat self-update guide →](/usage/flat-self-update)

## NOC certificates

- Purposes: sale/transfer, bank loan, rental, renovation, other
- Supporting document attachments
- Issue, reject, or cancel with reasons
- Generated NOC PDF on the letterhead
- Residents can request and track NOCs for their own flat

[NOC guide →](/usage/noc)

## Move-in / move-out

- Move-in, move-out, and internal shift, for owners or tenants
- Workflow: requested → approved → in progress → completed (or rejected/cancelled)
- Scheduled date and time window, vehicle and mover notes, document checklist
- Handover record on completion: meter readings, keys, access cards, parking tag
- Occupancy updates automatically; household transfer on internal shifts
- Move permit PDF and attachments

[Moves guide →](/usage/moves)

## Notices and board

- Resident notices with draft → published → archived lifecycle
- Notice PDFs on the letterhead
- Published-notice alerts
- Board of office-bearers with configurable roles; feeds the letterhead

[Notices & board guide →](/usage/notices-board)

## Staff attendance

- Staff roster with categories, tower, post, phone, and **photos** taken with the device camera
- Staff CSV template and bulk import
- **One-tap check-in / check-out**, once per person per day, with a 30-second guard against double taps
- Mark absent and clear absent
- Leave: casual, sick, earned, week off, unpaid, other
- Daily summary cards: roster, present, on leave, absent, open check-ins
- Attendance history per person
- Payroll CSV (one row per person per day) and clock CSV (every punch)

[Attendance guide →](/usage/attendance)

## School bus management

- Registry of schools and buses with CSV import/export and PDF
- **Gate logging** for pickup and drop-off, with automatic timestamps and child counts
- **Live bay occupancy** with a hold-at-approach warning
- Batches and staggered slots per bus
- Alerts: long wait, off-slot arrival, unmatched trip, batch over capacity, AM/PM mismatch
- Daily report (CSV/PDF), reconciliation, wait-time, and congestion reports
- **Today's buses** view for residents

[School bus guide →](/usage/school-bus)

## Inventory

- Items with SKU, barcode, photo, category, unit, minimum level, and price
- Automatic in-stock / low-stock / out-of-stock status
- Categories, suppliers (with GST), and multiple warehouses
- Stock in and stock out per warehouse, with a needs-replenishment list
- Immutable transaction log with before/after quantities
- Barcode lookup and Code 128 label printing
- Dashboard: stock value, value by category, top consumed, pending POs, low stock

[Inventory guide →](/usage/inventory)

## Purchasing

- Purchase orders: draft → approval → ordered → partially received → closed
- **Approval threshold** (default ₹10,000) with auto-approval below it
- Approval by Secretary, Treasurer, or Superadmin
- **Emergency POs** — approved immediately, signed off afterwards
- Receiving into a warehouse updates stock automatically
- Purchase requisitions, manual or **automatic on low stock**, convertible to POs
- AMC contracts with expiry reminders and one-click renewal

[Purchasing guide →](/usage/purchasing)

## Reports and alerts

- Stock valuation, consumption, and supplier spend — CSV and PDF
- Alerts for low stock, PO due, AMC expiry, stock received, new supplier, notice published, and bus gate exceptions

[Reports guide →](/usage/reports)

## Portals

- **Resident portal** — my flats, household changes, NOC and move requests, notices, today's buses ([guide](/usage/resident-portal))
- **Vendor portal** — suppliers see their own purchase orders, read-only ([guide](/usage/vendor-portal))
