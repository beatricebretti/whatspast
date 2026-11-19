export const palettes = [
  { id: 'rose', name: 'Rose', color: '#b35077' },
  { id: 'sage', name: 'Sage', color: '#357b66' },
  { id: 'ocean', name: 'Ocean', color: '#376f9e' },
  { id: 'plum', name: 'Plum', color: '#805591' },
];
export const appearanceKey = 'whatspast:appearance';
export function normalizeAppearance(value, prefersDark = false) {
  return {
    mode:
      value?.mode === 'dark' || value?.mode === 'light'
        ? value.mode
        : prefersDark
          ? 'dark'
          : 'light',
    palette: palettes.some((p) => p.id === value?.palette) ? value.palette : 'rose',
  };
}
