/** PMail+ app icon — teal squircle, envelope monogram, plus badge (matches HMailLogo). */
const PMail_LOGO_INNER = `<defs>
  <linearGradient id="pmail-g" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
    <stop stop-color="#0d4f6c"/>
    <stop offset="1" stop-color="#0d9488"/>
  </linearGradient>
  <linearGradient id="pmail-shine" x1="14" y1="16" x2="34" y2="34" gradientUnits="userSpaceOnUse">
    <stop stop-color="#ffffff" stop-opacity="0.95"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0.82"/>
  </linearGradient>
</defs>
<rect x="2" y="2" width="44" height="44" rx="11" fill="url(#pmail-g)"/>
<rect x="2" y="2" width="44" height="44" rx="11" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>
<path d="M13 17.5C13 16.1193 14.1193 15 15.5 15H32.5C33.8807 15 35 16.1193 35 17.5V30.5C35 31.8807 33.8807 33 32.5 33H15.5C14.1193 33 13 31.8807 13 30.5V17.5Z" fill="url(#pmail-shine)"/>
<path d="M13.8 17.2L24 25.1L34.2 17.2" stroke="#0d4f6c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M20.2 22.2V29.2M20.2 25.7H24.1M24.1 22.2V29.2M27.8 22.2V29.2" stroke="#0d4f6c" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="33.5" cy="14.5" r="3.25" fill="#fff" fill-opacity="0.92"/>
<path d="M32.4 14.5H34.6M33.5 13.4V15.6" stroke="#0d9488" stroke-width="1.2" stroke-linecap="round"/>`;

export const PMail_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" role="img" aria-label="PMail+">${PMail_LOGO_INNER}</svg>`;

export function buildPmailLogoDataUrl(size = 96): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" role="img" aria-label="PMail+">${PMail_LOGO_INNER}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const PMail_LOGO_DATA_URL = buildPmailLogoDataUrl(96);
