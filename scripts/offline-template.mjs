/** Render either compact or formatted service-worker templates, or fail the build. */
export function renderServiceWorker(template, version, urls) {
  const marker = /\/\*\s*__PRECACHE__\s*\*\/\s*\[\s*\]/;
  if (!template.includes('__BUILD_VERSION__') || !marker.test(template)) {
    throw new Error('Service-worker template is missing a build version or precache placeholder.');
  }
  return template.replace('__BUILD_VERSION__', version).replace(marker, () => JSON.stringify(urls));
}
