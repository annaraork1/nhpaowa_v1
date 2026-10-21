# Contracts: 024

## GET /flats
Query: existing filters + `limit` (default 50, max 200), `offset` (default 0).  
Response: `{ items: Flat[], total: number, limit: number, offset: number }`

## POST /flats/import-csv
Body: `{ csv: string, dryRun?: boolean, resolutions?: Record<string, 'keep'|'csv'> }`  
Preview (`dryRun: true`): `{ dryRun: true, created, updated, filled, skipped, conflicts[], errors[] }`  
Apply: same counts without conflicts (or remaining unresolved as errors).

Conflict: `{ id, row, tower, flatNumber, field, current, csv }`
