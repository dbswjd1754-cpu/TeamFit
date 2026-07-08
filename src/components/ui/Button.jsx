export default function Button({
  children, onClick, variant = 'primary',
  disabled = false, className = '', type = 'button',
  color = 'brand', // 'brand' | 'emerald'
}) {
  const base = 'w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200 active:scale-[0.98]';

  const variants = {
    primary: color === 'emerald'
      ? 'bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm'
      : 'bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm',
    secondary: 'bg-white text-brand-500 border border-brand-500 hover:bg-brand-50',
    ghost: 'bg-transparent text-gray-500 hover:bg-gray-100',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
