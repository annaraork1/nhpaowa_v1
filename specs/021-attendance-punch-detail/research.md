# Research: 021 Attendance Punch Detail

Association ops (security gates, housekeeping) need shift **times** and **duration**, not only Present/Absent. Industry muster sheets list In / Out / Hours per person-day.

NHPAOWA already computes these in `deriveDailyStatuses` for history and payroll CSV. Gap is presentation + roster `hours` on `day-state`.

Chosen approach: extend `buildDayStates`; UI formatting only — no schema migration.
