# Tasks: Flat & Household CSV

**Feature**: `015-flat-household-csv`

## Phase 1 — Specs

- [x] T001 Spec / plan / research / data-model / contracts / quickstart / checklist
- [x] T002 Cross-link 005, 013, ASSOCIATION-ROADMAP

## Phase 2 — Backend

- [x] T003 `flatCsv.js` — headers, template, serialize row, parse/import upsert
- [x] T004 Expand `GET /flats/export.csv`; add `csv-template` + `import-csv` routes

## Phase 3 — UI

- [x] T005 FlatsPage Import + Template controls; client API methods

## Phase 4 — Verify

- [x] T006 Smoke: export has household cols; import create+update; resident denied

## Phase 5 — Column help & multi-value UX

- [x] T007 Research + spec US5 / FR-009–010 / contracts / quickstart (pipe multi-value + #HELP)
- [x] T008 `FLAT_CSV_COLUMN_GUIDE`, template `#HELP` + multi samples; skip `#` tower rows; `GET /flats/csv-guide`
- [x] T009 Flats Import panel column guide with hover tips + samples
- [x] T010 Smoke: template has `#HELP` + `|` samples; guide JSON; import skips help; two vehicles import
