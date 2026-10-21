# Move-In / Move-Out

**Moves** schedules and records every move into, out of, or within the society, from the request through the gate to the final handover.

<img class="screenshot" src="/screenshots/moves.png" alt="Move requests" />

## Move types

| Type | Example |
|------|---------|
| Move in | New owner or tenant arriving |
| Move out | Owner or tenant leaving |
| Internal shift | Moving between flats on campus, for example T1024 → T3051 |

## Lifecycle

```txt
REQUESTED → APPROVED → IN_PROGRESS → COMPLETED
     ↘ REJECTED            ↘ CANCELLED
```

1. **New move request** — flat (and destination flat for internal shifts), owner or tenant, contact, scheduled date and time window, vehicle and mover notes, and a document checklist (ID, agreement copy, police verification).
2. **Approve** (✓) or **Reject** (✕).
3. On the day, the move appears under **Today at the gate**. Security marks it **in progress** when movers arrive.
4. **Complete** with the handover record: electricity and water meter readings, number of keys and access cards, parking tag, and notes. The flat's occupancy updates automatically.

Each move has a progress history, attachments, and a **PDF gate pass**.

## Who can do what

| Role | Access |
|------|--------|
| Superadmin, Secretary, Security Head, Estate Manager, Security Staff | Create, approve, start, complete |
| Treasurer, Committee, Staff | View |
| Resident | Request moves for their own flats; cannot approve or complete |
