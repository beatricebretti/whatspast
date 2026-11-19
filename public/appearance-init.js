// Apply saved colors before the application renders, including offline visits.
try {
  const value = JSON.parse(localStorage.getItem('whatspast:appearance') || 'null');
  document.documentElement.dataset.mode = ['light', 'dark'].includes(value?.mode)
    ? value.mode
    : matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  document.documentElement.dataset.palette = ['rose', 'sage', 'ocean', 'plum'].includes(
    value?.palette,
  )
    ? value.palette
    : 'rose';
} catch {
  document.documentElement.dataset.mode = matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  document.documentElement.dataset.palette = 'rose';
}
