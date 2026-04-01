/**
 * Geocoding utility — Nominatim (OpenStreetMap), completely free, no API key.
 * Rate limit: 1 request/second per Nominatim usage policy.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'LibraryHub-App/1.0 (library management system)';

/**
 * Geocode an address string → { lng, lat }
 * Returns null on failure (non-fatal — store still saved without coordinates).
 *
 * @param {string} address
 * @param {string} city
 * @returns {Promise<{lng: number, lat: number} | null>}
 */
export async function geocodeAddress(address, city) {
  try {
    const query = encodeURIComponent(`${address}, ${city}`);
    const url = `${NOMINATIM_BASE}/search?q=${query}&format=json&limit=1&addressdetails=0`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) {
      console.warn(`[Geocoding] Nominatim HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      console.warn(`[Geocoding] No results for: "${address}, ${city}"`);
      return null;
    }

    return { lng: parseFloat(data[0].lon), lat: parseFloat(data[0].lat) };
  } catch (err) {
    console.error('[Geocoding] Error:', err.message);
    return null;
  }
}

/**
 * Haversine formula — great-circle distance in km.
 *
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @returns {number} Distance in km (2 decimal places)
 */
export function haversineDistance(from, to) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;

  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}
