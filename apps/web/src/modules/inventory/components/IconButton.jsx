export function IconButton({
  label,
  onClick,
  disabled,
  tone = 'default',
  children,
  className = '',
  type = 'button',
}) {
  const tones = {
    default: 'icon-btn icon-btn-default',
    brand: 'icon-btn icon-btn-brand',
    danger: 'icon-btn icon-btn-danger',
  };

  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`${tones[tone] || tones.default} ${className}`}
    >
      {children}
    </button>
  );
}
