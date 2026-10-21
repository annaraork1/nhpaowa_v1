/** NHPAOWA / TATA New Haven apartment type catalog */
export const APARTMENT_CATALOG = [
  {
    apartmentType: '1.5 BHK',
    configuration: 'Standard Variant',
    superBuiltUpArea: 550,
    areaLabel: '~500–600 Sq. Ft. (approx.)',
  },
  {
    apartmentType: '2 BHK',
    configuration: 'Compact',
    superBuiltUpArea: 708,
    areaLabel: '708 Sq. Ft.',
  },
  {
    apartmentType: '2 BHK',
    configuration: 'Optima',
    superBuiltUpArea: 814,
    areaLabel: '814 Sq. Ft.',
  },
  {
    apartmentType: '2 BHK',
    configuration: 'Ultima',
    superBuiltUpArea: 966,
    areaLabel: '966 Sq. Ft.',
  },
  {
    apartmentType: '2 BHK',
    configuration: 'Elite',
    superBuiltUpArea: 1163,
    areaLabel: '1,163 Sq. Ft.',
  },
  {
    apartmentType: '3 BHK',
    configuration: 'Standard Variant',
    superBuiltUpArea: 1286,
    areaLabel: '1,286 Sq. Ft.',
  },
];

export const APARTMENT_TYPES = [
  ...new Set(APARTMENT_CATALOG.map((r) => r.apartmentType)),
];

export function findApartmentVariant(apartmentType, configuration) {
  return APARTMENT_CATALOG.find(
    (r) =>
      r.apartmentType === apartmentType && r.configuration === configuration
  );
}

export function configurationsForType(apartmentType) {
  return APARTMENT_CATALOG.filter((r) => r.apartmentType === apartmentType);
}

export function catalogKey(apartmentType, configuration) {
  return `${apartmentType}::${configuration}`;
}

export function formatFlatLabel(flat) {
  if (!flat) return '';
  const tower = flat.tower ?? flat.wing;
  const num = flat.flatNumber;
  if (tower == null || num == null || num === '') return '';
  return `T${tower}${String(num).trim()}`;
}

export function formatVariantLabel(flat) {
  if (!flat?.apartmentType && !flat?.flatType) return '';
  const type = flat.apartmentType || flat.flatType;
  const config = flat.configuration;
  const area =
    flat.superBuiltUpArea != null
      ? `${Number(flat.superBuiltUpArea).toLocaleString('en-IN')} Sq. Ft.`
      : null;
  return [type, config, area].filter(Boolean).join(' · ');
}
