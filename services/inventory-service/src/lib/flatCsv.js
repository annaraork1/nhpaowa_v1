import {
  APARTMENT_CATALOG,
  findApartmentVariant,
  formatCampusFlatId,
  parseCampusFlatQuery,
  EXTRA_FLAT_MEMBER_ROLES,
} from '@nhpaowa/shared-ui';
import { parseCsv } from './staffCsv.js';

export const FLAT_CSV_HEADERS = [
  'campusFlatId',
  'tower',
  'flatNumber',
  'floor',
  'apartmentType',
  'configuration',
  'superBuiltUpArea',
  'occupancyStatus',
  'parkingSlots',
  'notes',
  'primaryOwnerName',
  'primaryOwnerPhone',
  'primaryOwnerEmail',
  'members',
  'parkingAllotted',
  'vehicles',
  'pets',
  'emergencyContacts',
  'accessDevices',
];

const OCC = new Set(['OWNER_OCCUPIED', 'TENANT_OCCUPIED', 'VACANT']);
const VEHICLE_TYPES = new Set(['FOUR_WHEELER', 'TWO_WHEELER', 'EV', 'OTHER']);
const DEVICE_TYPES = new Set(['FOB', 'RFID_TAG', 'REMOTE', 'STICKER', 'OTHER']);
const DEVICE_STATUS = new Set(['ACTIVE', 'RETURNED', 'LOST']);
const EXTRA_MEMBER_ROLES = new Set(EXTRA_FLAT_MEMBER_ROLES);

/** Column guide — single source for template #HELP row + UI tooltips */
export const FLAT_CSV_COLUMN_GUIDE = [
  {
    key: 'campusFlatId',
    label: 'Campus flat id',
    required: false,
    allowed: 'T{tower}{FFU} e.g. T21031 (optional if tower+flatNumber set)',
    pattern: 'text',
    sample: 'T21031',
    tip: 'Optional. When tower/flatNumber blank, T21031 resolves to tower 21 / 031.',
  },
  {
    key: 'tower',
    label: 'Tower number',
    required: true,
    allowed: 'Active tower 1–16 or 21–35',
    pattern: 'text',
    sample: '21',
    tip: 'Required unless campusFlatId is provided. Rows whose tower starts with # are skipped.',
  },
  {
    key: 'flatNumber',
    label: 'Flat number (FFU)',
    required: true,
    allowed: '3-digit campus number: G=001–004, 3rd=031–034, 10th=101–104',
    pattern: 'text',
    sample: '031',
    tip: 'Required unless campusFlatId is provided. Upsert key is tower + flatNumber.',
  },
  {
    key: 'floor',
    label: 'Floor',
    required: false,
    allowed: '0 = Ground (G), then 1…N',
    pattern: 'number',
    sample: '3',
    tip: 'Optional; must match flat number floor digits when set.',
  },
  {
    key: 'apartmentType',
    label: 'Apartment type',
    required: false,
    allowed: 'Catalog types e.g. 1.5 BHK, 2 BHK, 3 BHK',
    pattern: 'text',
    sample: '3 BHK',
    tip: 'Fill-missing import: only applied when the flat field is empty.',
  },
  {
    key: 'configuration',
    label: 'Configuration',
    required: false,
    allowed: 'Catalog variant e.g. Standard Variant, Compact',
    pattern: 'text',
    sample: 'Standard Variant',
    tip: 'Used with apartmentType for catalog area. Fill-missing only.',
  },
  {
    key: 'superBuiltUpArea',
    label: 'Super built-up area',
    required: false,
    allowed: 'Number (sq ft). Leave blank to use catalog.',
    pattern: 'number',
    sample: '',
    tip: 'Leave blank unless overriding the catalog area.',
  },
  {
    key: 'occupancyStatus',
    label: 'Occupancy',
    required: false,
    allowed: 'OWNER_OCCUPIED | TENANT_OCCUPIED | VACANT',
    pattern: 'enum',
    sample: 'OWNER_OCCUPIED',
    tip: 'Exact tokens. Differing existing values become import conflicts.',
  },
  {
    key: 'parkingSlots',
    label: 'Entitled parking count',
    required: false,
    allowed: 'Integer guide count (allotments use parkingAllotted)',
    pattern: 'number',
    sample: '1',
    tip: 'Entitlement count only; named bays go in parkingAllotted.',
  },
  {
    key: 'notes',
    label: 'Notes',
    required: false,
    allowed: 'Free text',
    pattern: 'text',
    sample: '',
    tip: 'Optional office notes for the flat.',
  },
  {
    key: 'primaryOwnerName',
    label: 'Primary owner name',
    required: false,
    allowed: 'Full name',
    pattern: 'text',
    sample: 'Ravi Kumar',
    tip: 'Use with primaryOwnerPhone. Conflicts if existing primary differs.',
  },
  {
    key: 'primaryOwnerPhone',
    label: 'Primary owner phone',
    required: false,
    allowed: 'Phone digits',
    pattern: 'text',
    sample: '9876500001',
    tip: 'Required together with primaryOwnerName to create/update primary.',
  },
  {
    key: 'primaryOwnerEmail',
    label: 'Primary owner email',
    required: false,
    allowed: 'Email',
    pattern: 'text',
    sample: 'ravi@example.com',
    tip: 'Optional email for primary owner.',
  },
  {
    key: 'members',
    label: 'Other members (multi)',
    required: false,
    allowed:
      'ASSOCIATE_OWNER | TENANT | OWNER_FAMILY | TENANT_FAMILY',
    pattern: 'ROLE:name:phone:email  (join with |)',
    sample:
      'OWNER_FAMILY:Anita Sharma:9876500002:|TENANT:Ramesh:9876500003:ramesh@example.com|TENANT_FAMILY:Kavya:9876500004:',
    tip: 'Multiple people: separate with |. Primary owner uses dedicated columns. Missing people are added; existing matches are left unchanged.',
  },
  {
    key: 'parkingAllotted',
    label: 'Parking bay labels (multi)',
    required: false,
    allowed: 'Unique bay labels',
    pattern: 'label|label',
    sample: 'B1-101|B1-102',
    tip: 'Multiple bays: separate labels with |. Creates label if missing; errors if already allotted elsewhere.',
  },
  {
    key: 'vehicles',
    label: 'Vehicles (multi)',
    required: false,
    allowed: 'FOUR_WHEELER | TWO_WHEELER | EV | OTHER',
    pattern: 'TYPE:registrationNo:make:model:color:stickerNo  (join with |)',
    sample:
      'FOUR_WHEELER:KA01AB1234:Hyundai:Creta:White:STK-1|TWO_WHEELER:KA01XY9999:Honda:Activa:Grey:',
    tip: 'Multiple vehicles: separate with |. Leave trailing field empty if no sticker. Empty cell = leave existing vehicles unchanged.',
  },
  {
    key: 'pets',
    label: 'Pets (multi)',
    required: false,
    allowed: 'Any species text',
    pattern: 'species:name:breed:rabiesYYYY-MM-DD  (join with |)',
    sample: 'Dog:Bruno:Labrador:2027-06-01|Cat:Mimi:Persian:',
    tip: 'Multiple pets: separate with |. Rabies date optional (ISO YYYY-MM-DD).',
  },
  {
    key: 'emergencyContacts',
    label: 'Emergency contacts (multi)',
    required: false,
    allowed: 'Y or N for primary flag',
    pattern: 'name:phone:relationship:Y|N  (join contacts with |)',
    sample: 'Priya Kumar:9876500099:Spouse:Y|Raj Kumar:9876500088:Brother:N',
    tip: 'Multiple contacts: separate with |. Last field Y/N marks primary contact.',
  },
  {
    key: 'accessDevices',
    label: 'Access devices (multi)',
    required: false,
    allowed:
      'TYPE FOB|RFID_TAG|REMOTE|STICKER|OTHER ; STATUS ACTIVE|RETURNED|LOST',
    pattern: 'TYPE:identifier:STATUS  (join with |)',
    sample: 'FOB:FOB-T1-101:ACTIVE|STICKER:STK-88:ACTIVE',
    tip: 'Multiple devices: separate with |. Default status ACTIVE if omitted.',
  },
];

export const FLAT_CSV_MULTI_VALUE_RULE =
  'One row = one flat. Put multiple members/vehicles/pets/etc. in the SAME cell: separate records with | (pipe), and fields inside each record with : (colon). Example vehicles: FOUR_WHEELER:KA01AB1234:Hyundai:Creta:White:STK-1|TWO_WHEELER:KA01XY9999:Honda:Activa:Grey:  Leave a household cell blank to keep existing data.';

export function buildFlatCsvGuide() {
  return {
    multiValueRule: FLAT_CSV_MULTI_VALUE_RULE,
    columns: FLAT_CSV_COLUMN_GUIDE,
  };
}

export function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function helpRowCells() {
  return FLAT_CSV_HEADERS.map((h) => {
    if (h === 'campusFlatId' || h === 'tower') {
      return h === 'campusFlatId' ? '#HELP' : '';
    }
    const col = FLAT_CSV_COLUMN_GUIDE.find((c) => c.key === h);
    if (!col) return '';
    return `SAMPLE: ${col.sample || '(blank)'} | ${col.pattern} | ${col.allowed}`;
  });
}

export const FLAT_CSV_TEMPLATE = [
  FLAT_CSV_HEADERS.join(','),
  helpRowCells().map(csvEscape).join(','),
  [
    'T21031',
    '21',
    '031',
    '3',
    '3 BHK',
    'Standard Variant',
    '',
    'OWNER_OCCUPIED',
    '1',
    '',
    'Ravi Kumar',
    '9876500001',
    'ravi@example.com',
    'OWNER_FAMILY:Anita Sharma:9876500002:|TENANT:Ramesh:9876500003:ramesh@example.com|TENANT_FAMILY:Kavya:9876500004:',
    'B1-21031',
    'FOUR_WHEELER:KA01AB1234:Hyundai:Creta:White:STK-1|TWO_WHEELER:KA01XY9999:Honda:Activa:Grey:',
    'Dog:Bruno:Labrador:2027-06-01|Cat:Mimi:Persian:',
    'Priya Kumar:9876500099:Spouse:Y|Raj Kumar:9876500088:Brother:N',
    'FOB:FOB-T21-031:ACTIVE|STICKER:STK-88:ACTIVE',
  ]
    .map(csvEscape)
    .join(','),
  [
    'T21001',
    '21',
    '001',
    '0',
    '3 BHK',
    'Standard Variant',
    '',
    'VACANT',
    '1',
    'CSV sample — delete before real import if unused',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]
    .map(csvEscape)
    .join(','),
].join('\n');
function splitRecords(raw) {
  return String(raw || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitFields(raw) {
  return String(raw || '').split(':').map((s) => s.trim());
}

function resolveArea(apartmentType, configuration, explicit) {
  if (explicit !== '' && explicit != null && !Number.isNaN(Number(explicit))) {
    return Number(explicit);
  }
  const variant =
    typeof findApartmentVariant === 'function'
      ? findApartmentVariant(apartmentType, configuration)
      : APARTMENT_CATALOG.find(
          (v) =>
            v.apartmentType === apartmentType &&
            v.configuration === configuration
        );
  return variant?.superBuiltUpArea ?? null;
}

export function serializeFlatCsvRow(flat) {
  const members = flat.members || [];
  const primary = members.find((m) => m.role === 'PRIMARY_OWNER');
  const extras = members
    .filter((m) => m.role !== 'PRIMARY_OWNER')
    .map((m) =>
      [m.role, m.name, m.phone || '', m.email || ''].join(':')
    )
    .join('|');

  const parking = (flat.parkingAllotments || flat.parkingSlotsAllotted || [])
    .map((s) => s.label)
    .join('|');

  const vehicles = (flat.vehicles || [])
    .filter((v) => !v.approvalStatus || v.approvalStatus === 'APPROVED')
    .map((v) =>
      [
        v.vehicleType,
        v.registrationNo,
        v.make || '',
        v.model || '',
        v.color || '',
        v.stickerNo || v.rfidTag || '',
      ].join(':')
    )
    .join('|');

  const pets = (flat.pets || [])
    .filter((p) => !p.approvalStatus || p.approvalStatus === 'APPROVED')
    .map((p) => {
      const rabies = p.rabiesValidTill
        ? new Date(p.rabiesValidTill).toISOString().slice(0, 10)
        : '';
      return [p.species, p.name, p.breed || '', rabies].join(':');
    })
    .join('|');

  const contacts = (flat.emergencyContacts || [])
    .filter((c) => !c.approvalStatus || c.approvalStatus === 'APPROVED')
    .map((c) =>
      [c.name, c.phone, c.relationship || '', c.isPrimary ? 'Y' : 'N'].join(
        ':'
      )
    )
    .join('|');

  const devices = (flat.accessDevices || [])
    .filter((d) => !d.approvalStatus || d.approvalStatus === 'APPROVED')
    .map((d) => [d.deviceType, d.identifier, d.status || 'ACTIVE'].join(':'))
    .join('|');

  return [
    formatCampusFlatId(flat.tower, flat.flatNumber),
    flat.tower,
    flat.flatNumber,
    flat.floor ?? '',
    flat.apartmentType || '',
    flat.configuration || '',
    flat.superBuiltUpArea ?? '',
    flat.occupancyStatus,
    flat.parkingSlots ?? 0,
    flat.notes || '',
    primary?.name || '',
    primary?.phone || '',
    primary?.email || '',
    extras,
    parking,
    vehicles,
    pets,
    contacts,
    devices,
  ]
    .map(csvEscape)
    .join(',');
}

export function buildFlatsExportCsv(flats) {
  return [FLAT_CSV_HEADERS.join(','), ...flats.map(serializeFlatCsvRow)].join(
    '\n'
  );
}

export { importFlatsCsv } from './flatCsvImport.js';
