/** Shared NHPAOWA letterhead details for print / PDF-style views */
export const ASSOCIATION_BRAND = {
  shortName: 'NHPAOWA',
  fullName:
    'New Haven Peenya Apartment Owners Welfare Association (NHPAOWA)',
  campus: 'TATA New Haven · Bengaluru',
  tagline: 'Working together for Better Living',
  logoSrc: '/nhpaowa-logo.png',
  signatureSrc: '/president-signature.png',
};

export const DEFAULT_BOARD_MEMBERS = [
  { role: 'President', name: 'V. G. Jayaramaiah' },
  { role: 'Vice President', name: 'Lokesh Kumar Gupta' },
  { role: 'Secretary', name: 'Adarsh A Patil' },
  { role: 'Joint Secretary', name: 'Moushimi Chakraborty' },
  { role: 'Treasurer', name: 'Praveen Danagowdru' },
  { role: 'Committee Member', name: 'Vikas' },
  { role: 'Committee Member', name: 'Saurabh' },
  { role: 'Committee Member', name: 'Ranjitha' },
  { role: 'Estate Manager', name: 'Mariyayya Swamy' },
];

export function getPresident(letterhead) {
  if (letterhead?.president) return letterhead.president;
  return (
    DEFAULT_BOARD_MEMBERS.find((m) => m.role === 'President') ||
    DEFAULT_BOARD_MEMBERS[0]
  );
}

export function getBoardMembers(letterhead) {
  if (letterhead?.members?.length) return letterhead.members;
  return DEFAULT_BOARD_MEMBERS;
}
