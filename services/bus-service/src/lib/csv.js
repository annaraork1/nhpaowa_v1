export function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function parseCsv(text) {
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };

  function splitLine(line) {
    const cells = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === ',' && !inQ) {
        cells.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    return cells;
  }

  const headers = splitLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/\s+/g, '_')
  );
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row = { __row: i + 1 };
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? '').trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

export const SCHOOL_CSV_TEMPLATE = `name,primary_contact_name,primary_contact_phone,address
Delhi Public School,Coordinator DPS,9800000001,Example Road
`;

export const BUS_CSV_TEMPLATE = `school_name,vehicle_registration_number,driver_name,driver_phone,conductor_name,conductor_phone,seating_capacity
Delhi Public School,KA01AB9999,Driver Name,9900000099,,,40
`;
