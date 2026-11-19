import { useEffect, useRef, useState } from 'react';
import { Palette, Sun, Moon, Check } from 'lucide-react';
import { palettes } from './appearance.mjs';
import type { Appearance } from './appearance.mjs';
export function AppearanceControl({
  value,
  onChange,
}: {
  value: Appearance;
  onChange: (appearance: Appearance) => void;
}) {
  const [open, setOpen] = useState(false),
    root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div className="appearance-control" ref={root}>
      <button
        ref={trigger}
        className={`icon-button appearance-trigger ${open ? 'active' : ''}`}
        aria-label="Appearance settings"
        aria-expanded={open}
        aria-controls="appearance-panel"
        onClick={() => setOpen(!open)}
      >
        <Palette size={19} />
      </button>
      {open && (
        <section
          id="appearance-panel"
          className="appearance-panel"
          aria-label="Appearance settings"
        >
          <header>
            <strong>Appearance</strong>
            <span>{value.mode === 'dark' ? 'Dark' : 'Light'}</span>
          </header>
          <div className="mode-options" role="group" aria-label="Color mode">
            {(['light', 'dark'] as const).map((mode) => (
              <button
                key={mode}
                aria-pressed={value.mode === mode}
                className={value.mode === mode ? 'selected' : ''}
                onClick={() => onChange({ ...value, mode })}
              >
                {mode === 'light' ? <Sun size={15} /> : <Moon size={15} />}
                <span>{mode === 'light' ? 'Light' : 'Dark'}</span>
              </button>
            ))}
          </div>
          <div className="palette-options" role="group" aria-label="Color palette">
            {palettes.map((p) => (
              <button
                key={p.id}
                aria-pressed={value.palette === p.id}
                className={value.palette === p.id ? 'selected' : ''}
                onClick={() => onChange({ ...value, palette: p.id })}
              >
                <span className="palette-swatch" style={{ background: p.color }}>
                  {value.palette === p.id && <Check size={11} />}
                </span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
          <p>Saved on this device.</p>
        </section>
      )}
    </div>
  );
}
