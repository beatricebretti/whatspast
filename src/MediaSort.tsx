import { ArrowDownUp } from 'lucide-react';
import type { MediaOrder } from './media.mjs';
export function MediaSort({
  value,
  onChange,
}: {
  value: MediaOrder;
  onChange: (order: MediaOrder) => void;
}) {
  return (
    <label className="media-sort">
      <ArrowDownUp size={14} />
      <select
        aria-label="Sort media by date"
        value={value}
        onChange={(e) => onChange(e.target.value as MediaOrder)}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </label>
  );
}
