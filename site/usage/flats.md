# Flat Owners & Household

**Flat owners** is the association's single register of every unit and who lives there. It is the foundation for NOCs, moves, resident logins, and the self-update drive.

<img class="screenshot" src="/screenshots/flats.png" alt="Flat owners register" />

## The campus register

The register is pre-seeded with the full TATA New Haven campus — about **1,705 flats** in **31 towers**:

| Rule | Value |
|------|-------|
| Active towers | 1–16 and 21–35 (towers 17–20, Riva, are excluded) |
| Floors | **G**, then 1 to 14, 12, or 10 depending on the tower |
| Flats per floor | 4 |
| Flat number | Floor + unit: ground floor `001`–`004`, 3rd floor `031`–`034`, 10th floor `101`–`104` |
| Display label | `T{tower}{flat}` — for example **T21031** is tower 21, 3rd floor, unit 1 |
| Apartment type | One type per tower, from the NHPAOWA apartment catalogue (BHK, variant, area) |

## Find a flat

Type in **Search** — any of these work:

- Campus ID: `T21031`, `21031`, or just `031`
- Tower, apartment type
- Owner or tenant name, phone, or email

Narrow further with **Tower**, **Floor**, **Occupancy** (owner-occupied, tenant, vacant), and **Apartment type**. The list pages 50 flats at a time for speed.

## Flat details and members

Open a flat (👁) to see its type, floor, parking slots, occupancy, and members. Each member has a role:

| Member role | Meaning |
|-------------|---------|
| Primary owner | The registered owner — at most one per flat |
| Associate owner | Co-owner |
| Tenant | Current tenant |
| Owner family / Tenant family | Family members living in the flat (any number) |

A member can be linked to a platform user so that person can sign in to the [resident portal](/usage/resident-portal).

## Household register

Use the **household** action on a flat to record:

- **Vehicles** — registration, type, parking slot
- **Pets**
- **Parking** allocation
- **Emergency contacts**
- **Access devices** — cards, tags, fobs

Staff changes apply immediately. Changes submitted by residents appear under **Pending household approvals** at the top of the page; approve (✓) or reject (✕) each one.

## CSV import and export

| Button | What it does |
|--------|--------------|
| **Export CSV** | All flats with members and household details, matching the import format |
| **Export PDF** | Printable register on the letterhead |
| **CSV template** | Empty file with the expected columns |
| **Import CSV** | Bulk load or update flats |

Import is designed for merging data from builder spreadsheets into the seeded register:

- Rows are matched on **tower + flat number** (or a `campusFlatId` column such as `T21031`).
- By default import **only fills empty fields** — it never overwrites existing values silently.
- When the CSV disagrees with what's stored, the preview lists each conflict. Choose **Keep current** or **Use CSV** per field, or for all conflicts at once.

## Mobile

On phones the filters stack and each flat becomes a card with the same actions.

<img class="screenshot mobile" src="/screenshots/mobile-flats.png" alt="Flat owners on a phone" />

## Who can do what

| Role | Access |
|------|--------|
| Superadmin, Secretary | View, edit, delete, import |
| Estate Manager | View and edit |
| Treasurer, Committee, Staff, Security Head, Security Staff | View |
| Resident | Own flats only; household changes need approval |
