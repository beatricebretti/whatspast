import { useLayoutEffect, useState } from 'react';
import { appearanceKey, normalizeAppearance } from './appearance.mjs';
import type { Appearance } from './appearance.mjs';
function initialAppearance() {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  try {
    return normalizeAppearance(JSON.parse(localStorage.getItem(appearanceKey) || 'null'), dark);
  } catch {
    return normalizeAppearance(null, dark);
  }
}
export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(initialAppearance);
  useLayoutEffect(() => {
    document.documentElement.dataset.mode = appearance.mode;
    document.documentElement.dataset.palette = appearance.palette;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', appearance.mode === 'dark' ? '#1d1a1e' : '#faf7f9');
    try {
      localStorage.setItem(appearanceKey, JSON.stringify(appearance));
    } catch {
      /* The selected appearance still works for this session. */
    }
  }, [appearance]);
  return { appearance, setAppearance };
}
