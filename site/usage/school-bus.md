# School Bus Management

The campus gate handles around **50 school bus movements a day** from about 25 schools. This module replaces the paper gate register: guards log each bus in and out, the gate's bays are managed so buses don't queue on the road, and the committee gets daily counts and congestion reports.

It runs as its own service (`bus-service`, port 4002) with its own database schema.

## Bus gate (Security Staff)

<img class="screenshot" src="/screenshots/bus-gate.png" alt="School bus gate" />

1. Choose **PICKUP** (morning, children board) or **DROP-OFF** (afternoon, children alight). Logging is locked until a direction is chosen.
2. Pick the bus from today's roster.
3. Log the movement:
   - **Pickup:** record **IN** when the bus arrives, then the child count and **OUT** when it leaves.
   - **Drop-off:** record the child count and **IN** when it arrives, then **OUT** when it leaves.

Timestamps are automatic and entries can't be edited afterwards — a mistake is fixed by logging a correction row that references the original — so the log is a trustworthy record. The child count is entered **once per trip**.

**Live occupancy** shows how many bays are in use (for example `0/3 bays`). When every bay is full, the screen tells the guard to hold incoming buses at the approach.

## Alerts

Exceptions go to the notification bell:

| Alert | Raised when |
|-------|-------------|
| Long wait | A bus stays inside longer than the long-wait threshold |
| Off-slot | A bus arrives outside its assigned slot plus the buffer |
| Unmatched trip | A bus has an IN with no OUT by the cutoff time |
| Batch capacity | More buses are inside than the batch allows |
| AM/PM mismatch | A morning bus is logged as drop-off, or the reverse |

## Schools & buses

The registry of schools and the recurring buses that serve them — vehicle registration, driver and conductor contacts, and home school. One-off visitors don't belong here.

<img class="screenshot" src="/screenshots/bus-schools.png" alt="Schools and buses registry" />

CSV templates, imports, and exports are available for both schools and buses, plus a registry PDF. Deactivated buses drop off the gate roster.

## Batches & slots

Batches spread arrivals so the gate isn't overwhelmed. Each batch has a direction (pickup or drop-off), a time window, and a bay capacity (default 3). Buses are assigned staggered slots inside a batch.

<img class="screenshot" src="/screenshots/bus-batches.png" alt="Bus batches and slots" />

The alert thresholds are set at the top of the page: long-wait minutes, off-slot buffer minutes, and the unmatched-OUT cutoff time.

## Bus reports

Pick a date to see every bus with its pickup and drop-off times and child counts.

<img class="screenshot" src="/screenshots/bus-reports.png" alt="Bus reports" />

| Export | Contents |
|--------|----------|
| Daily CSV / Daily PDF | The table above for the chosen date |
| Reconciliation CSV | IN/OUT pairs and unmatched trips |
| Wait-times CSV | Time each bus spent inside |
| Congestion CSV | Bay usage per batch |

## Today's buses (residents)

Residents see the day's schedule and each bus's status. Child counts and driver phone numbers are not shown to them.

<img class="screenshot" src="/screenshots/resident-buses.png" alt="Today's buses for residents" />

## Who can do what

| Role | Bus gate | Reports | Schools & buses, Batches |
|------|:---:|:---:|:---:|
| Superadmin, Secretary, Security Head, Estate Manager | ✓ | ✓ | ✓ |
| Security Staff | ✓ | View | — |
| Treasurer, Committee | — | View | — |
| Resident | Today's buses only | — | — |

Not in this version: live GPS, per-child RFID, and a driver app.
