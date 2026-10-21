# Roles & Permissions

Every user has exactly one role. The role decides which menu items appear and which actions (view, create/edit, delete, approve) are allowed. The same permission matrix is enforced by the web app **and** by every API, so hiding a button is never the only protection.

## Roles

| Role | Typical person | Purpose |
|------|----------------|---------|
| **Superadmin** | Platform administrator | Everything, plus user administration and the board register |
| **Secretary** | Association secretary | Runs the office: flats, NOC, notices, moves, inventory, settings |
| **Treasurer** | Association treasurer | Read access across modules; approves purchase orders and NOCs |
| **Committee** | Committee members | Read access; can edit inventory master data |
| **Staff** | Facility / maintenance staff | Stock in/out, requisitions, barcodes, attendance |
| **Security Head** | Head of security | Attendance, moves, bus gate and bus registry |
| **Estate Manager** | Facility manager | Flats, moves, attendance, bus administration, reports |
| **Security Staff** | Gate guards | Bus gate, attendance punch, moves |
| **Resident** | Flat owner or tenant | Own flat and household, NOC and move requests, notices, today's buses |
| **Vendor** | Supplier contact | Vendor portal showing only their own purchase orders |

## Permission matrix

**V** = view, **E** = create/edit, **D** = delete, **A** = approve, **—** = no access.

| Feature | Superadmin | Secretary | Treasurer | Committee | Staff | Security Head | Estate Mgr | Security Staff | Resident | Vendor |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Home | V | V | V | V | V | V | V | V | V | — |
| Dashboard | V | V | V | V | V | — | V | — | — | — |
| Users | VE | — | — | — | — | — | — | — | — | — |
| Flat owners | VED | VED | V | V | V | V | VE | V | VE¹ | — |
| NOC | VE | VE | VE | V | — | V | V | — | VE¹ | — |
| Notices | VE | VE | V | V | — | V | V | — | V | — |
| Board | VED | V | — | — | — | — | V | — | — | — |
| Attendance | VE | VE | V | V | VE | VE | V | VE | — | — |
| Bus gate & reports | VE | VE | V | V | — | VE | VE | VE | V² | — |
| Bus registry & slots | VE | VE | — | — | — | VE | VE | — | — | — |
| Moves | VE | VE | V | V | V | VE | VE | VE | VE¹ | — |
| Items | VED | VED | V | VE | V | — | — | — | — | — |
| Categories | VED | VED | V | VE | V | — | — | — | — | — |
| Suppliers | VED | VED | V | VE | V | — | — | — | — | — |
| Warehouses | VE | VE | V | VE | V | — | — | — | — | — |
| Barcodes | VE | VE | V | V | VE | — | — | — | — | — |
| Purchase orders | VEA | VEA | VEA | VE | VE | — | — | — | — | — |
| Requisitions | VE | VE | VE | VE | VE | — | — | — | — | — |
| Stock & transactions | VE | VE | VE | VE | VE | — | — | — | — | — |
| AMC contracts | VED | VED | V | VE | V | — | — | — | — | — |
| Reports | V | V | V | V | V | — | V | — | — | — |
| Alerts | VE | VE | VE | VE | VE | V | V | V | V | — |
| Settings | VE | VE | V | V | — | — | — | — | — | — |
| Vendor portal | — | — | — | — | — | — | — | — | — | V |

1. Residents only see and act on flats linked to their account. They can create NOC and move **requests** but cannot approve, start, or complete them. Household changes they submit stay **pending** until staff approve.
2. Residents see **Today's buses** — schedule and status only, without child counts or driver phone numbers.

The matrix is defined once in `packages/shared-auth/src/permissions.js` and shared by the web app and all services.

## Customising operations roles

Superadmin can switch individual left-menu features on or off for **Security Head**, **Estate Manager**, **Security Staff**, and **Staff**. This narrows or widens what those roles can *view*; create/edit/delete rights still follow the matrix above. See [Users & Menu Features](/administration/users#role-menu-features).

## Same screen, different roles

Security Staff see only the gate-facing menu:

<img class="screenshot" src="/screenshots/bus-gate.png" alt="Security Staff menu with Bus gate" />

Residents get their own home and menu:

<img class="screenshot" src="/screenshots/resident-home.png" alt="Resident home" />
