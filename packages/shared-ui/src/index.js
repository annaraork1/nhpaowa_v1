/** Shared design tokens for NHPAOWA shell modules. */
export const colors = {
  forest: '#1B4D3E',
  forestSoft: '#2D6A4F',
  sand: '#F3EDE3',
  ink: '#1A1F1C',
  accent: '#C45C26',
  muted: '#6B736E',
  border: '#D9D2C5',
  danger: '#B42318',
  warning: '#B54708',
  success: '#027A48',
};

export const statusBadge = {
  IN_STOCK: { label: 'In Stock', tone: 'success' },
  LOW_STOCK: { label: 'Low Stock', tone: 'warning' },
  OUT_OF_STOCK: { label: 'Out of Stock', tone: 'danger' },
};

export * from './apartmentCatalog.js';
export * from './towerCatalog.js';
export * from './associationCalendar.js';
export * from './flatMembers.js';
