export type Appearance = { mode: 'light' | 'dark'; palette: 'rose' | 'sage' | 'ocean' | 'plum' };
export const palettes: { id: Appearance['palette']; name: string; color: string }[];
export const appearanceKey: string;
export function normalizeAppearance(value: unknown, prefersDark?: boolean): Appearance;
