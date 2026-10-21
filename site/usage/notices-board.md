# Notices & Board

## Resident notices

**Notices** publishes official circulars — maintenance schedules, compliance drives, security advisories, AGM reminders — as PDFs on the association letterhead.

<img class="screenshot" src="/screenshots/notices.png" alt="Resident notices" />

1. **New notice** — title, category (General, Maintenance, Compliance, …), and body.
2. It's saved as **Draft**. Preview (👁) and edit (✏️) until it's ready.
3. **Publish** generates the PDF and makes the notice visible to residents.
4. Download (⬇) the PDF to share on WhatsApp or print for notice boards.
5. Archive (⊘) a notice that is no longer current.

Filter by status or search titles and body text. Residents see published notices on their home page and under **Notices**.

| Role | Access |
|------|--------|
| Superadmin, Secretary | Create, edit, publish, archive |
| Treasurer, Committee, Security Head, Estate Manager, Resident | View published notices |

## Board & office bearers

**Board** holds the association's office bearers. These records drive every letterhead: the board list printed down the left side of NOCs, notices, and other PDFs, and the President's signature at the bottom.

<img class="screenshot" src="/screenshots/board.png" alt="Board and office bearers" />

- **Roles** tab — President, Vice President, Secretary, Joint Secretary, Treasurer, Committee Member, Estate Manager, or custom roles, in display order.
- **Members** tab — the person holding each role, with optional phone and email, and an **Active** flag.

When the board changes after an election, update the members here. Regenerate existing notice PDFs if you want them to carry the new letterhead (`scripts/regen-notice-pdfs.mjs`, see [Command Line](/administration/command-line#database)).

| Role | Access |
|------|--------|
| Superadmin | Full edit |
| Secretary, Estate Manager | View |
