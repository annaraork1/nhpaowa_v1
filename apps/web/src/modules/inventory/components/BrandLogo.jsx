/** Shared NHPAOWA brand mark */
export function BrandLogo({
  variant = 'full',
  className = '',
  imgClassName = '',
}) {
  if (variant === 'mark') {
    return (
      <img
        src="/favicon-192.png"
        alt="NHPAOWA"
        className={imgClassName || 'h-10 w-10 rounded-lg bg-panel object-contain p-0.5'}
      />
    );
  }
  return (
    <img
      src="/nhpaowa-logo.png"
      alt="TATA New Haven NHPAOWA — Working together for Better Living"
      className={className || 'h-auto w-full max-w-[280px] object-contain'}
    />
  );
}
