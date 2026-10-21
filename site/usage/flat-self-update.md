# Flat Self-Update Link

Most residents won't create an account just to correct their contact details. The self-update drive lets them confirm occupancy and owner/tenant contacts **without signing in**, using only their tower number. Every submission is reviewed by staff before it touches the register.

## The resident form

Residents open `/flat-update` (from a link, QR code, or the sign-in page), enter their tower number — `21031` or `T21031` — and press **Continue**.

<img class="screenshot" src="/screenshots/flat-update.png" alt="Login-free flat update form" />

The form shows the flat summary with current details pre-filled. The resident confirms or corrects:

- Occupancy (owner-occupied, tenant, vacant)
- Primary and secondary owner name and phone
- Tenant name and phone

Submitting creates a **pending** update. Unknown tower numbers are rejected.

Pre-fill a specific flat with `/flat-update?flat=21031`.

## Five collection channels

| # | Channel | Where | Use it for |
|---|---------|-------|------------|
| 1 | Public form | `/flat-update` | Residents on their own phones |
| 2 | Share / WhatsApp | `/flat-update/share` | Copy the link or open a WhatsApp share with suggested notice text |
| 3 | Paper form | `/flat-update/paper` | Printable A4 sheets for tower captains (4–12 flats per sheet, or a 12+ table) |
| 4 | Kiosk | `/flat-update?kiosk=1` | Large-text mode on a clubhouse tablet |
| 5 | Staff CSV | **Flat owners → Import CSV** | Office entry of paper returns and spreadsheets |

<div class="screenshot-row">
  <img class="screenshot" style="flex: 1 1 420px; min-width: 0" src="/screenshots/flat-update-share.png" alt="Share link page" />
  <img class="screenshot" style="flex: 1 1 420px; min-width: 0" src="/screenshots/flat-update-paper.png" alt="Paper collection form" />
</div>

## Reviewing submissions

Staff open **Flat self-updates**. Pending submissions appear at the top with the proposed occupancy and contacts.

<img class="screenshot" src="/screenshots/flat-self-updates.png" alt="Flat self-updates review queue" />

- **Approve** applies the occupancy and contacts to the flat and marks it **P1 verified**.
- **Reject** with a reason leaves the register unchanged.

The page also shows collection progress — per tower, how many flats are still at seed data versus verified — and **Per-flat links CSV** produces one prefilled link per flat for notice boards or captains.

## What the public form doesn't collect

The login-free form is limited to occupancy and contacts (P1). Vehicles, pets, parking, emergency contacts, and access devices (P2) are collected through the [household register](/usage/flats#household-register), the resident portal, CSV import, or the paper form.
