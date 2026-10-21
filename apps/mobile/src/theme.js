export const colors = {
  brand: '#2563eb',
  surface: '#f1f5f9',
  ink: '#0f172a',
  muted: '#64748b',
  line: '#e2e8f0',
  success: '#16a34a',
  danger: '#dc2626',
  sidebar: '#0f2744',
};

export function statusColor(status) {
  if (status === 'IN_STOCK') return colors.success;
  if (status === 'LOW_STOCK' || status === 'OUT_OF_STOCK') return colors.danger;
  return colors.muted;
}
