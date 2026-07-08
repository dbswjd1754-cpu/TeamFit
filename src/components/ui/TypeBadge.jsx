import { TYPES } from '../../data/questions';

export default function TypeBadge({ typeKey, size = 'md' }) {
  const type = TYPES[typeKey];
  if (!type) return null;
  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizes[size]}`}
      style={{ backgroundColor: type.bg, color: type.color }}
    >
      <span>{type.emoji}</span>
      <span>{type.name}</span>
    </span>
  );
}
