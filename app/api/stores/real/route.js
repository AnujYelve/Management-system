export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';

// Simple in-memory cache keyed by "lat,lng,radius"
// Entries expire after CACHE_TTL_MS milliseconds
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

/**
 * Fetch real public libraries from the Overpass API and normalise them.
 */
async function queryOverpass(lat, lng, radiusDeg) {
  const minLat = lat - radiusDeg;
  const maxLat = lat + radiusDeg;
  const minLng = lng - radiusDeg;
  const maxLng = lng + radiusDeg;

  const query = `[out:json][timeout:12];
(
  node["amenity"="library"](${minLat},${minLng},${maxLat},${maxLng});
  way["amenity"="library"](${minLat},${minLng},${maxLat},${maxLng});
  relation["amenity"="library"](${minLat},${minLng},${maxLat},${maxLng});
);
out center;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'LibraryHub-App/1.0 (library management system)',
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(14000),
  });

  if (!res.ok) {
    throw new Error(`Overpass API responded with HTTP ${res.status}`);
  }

  const data = await res.json();

  return (data.elements || [])
    .map((el) => {
      // Nodes → lat/lon; ways/relations → center.lat, center.lon
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon  ?? el.center?.lon;
      if (!elLat || !elLng) return null;

      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || tags['int_name'] || 'Public Library';

      // Build address
      const addrParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
      ].filter(Boolean);
      const address = addrParts.length > 0
        ? addrParts.join(' ')
        : (tags['addr:full'] || '');

      const city =
        tags['addr:city']    ||
        tags['addr:town']    ||
        tags['addr:village'] ||
        tags['addr:suburb']  ||
        tags['addr:county']  ||
        tags['addr:state']   ||
        '';

      return {
        _id: `osm-${el.type}-${el.id}`,
        storeName: name,
        address,
        city,
        timings: tags.opening_hours || '',
        isOpenToday: true,
        storeImage: '',
        location: {
          type: 'Point',
          coordinates: [elLng, elLat],
        },
        isReal: true,
        sourceType: 'osm',
        osmId: el.id,
        osmType: el.type,
        website: tags.website || tags.url || tags['contact:website'] || '',
        phone: tags.phone || tags['contact:phone'] || '',
        wikipedia: tags.wikipedia || '',
        wikidata: tags.wikidata || '',
      };
    })
    .filter(Boolean);
}

/**
 * GET /api/stores/real
 *
 * Query params:
 *   lat         (required) — user latitude
 *   lng         (required) — user longitude
 *   radius      (optional) — search radius in km, default 15
 *
 * Returns normalised public library data from OpenStreetMap Overpass API.
 * Results are cached for 5 minutes per unique (lat, lng, radius) combination.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const radiusKm = Math.min(parseFloat(searchParams.get('radius') || '15'), 50); // cap at 50 km

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'lat and lng query parameters are required' },
        { status: 400 }
      );
    }

    // ── Cache lookup ─────────────────────────────────────────────────────────
    // Round to 3 decimal places (~111 m) so near-identical locations share cache
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)},${radiusKm}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        libraries: cached.data,
        total: cached.data.length,
        source: 'cache',
        cachedAt: new Date(cached.timestamp).toISOString(),
      });
    }

    // Convert km to degrees (1° ≈ 111 km)
    const radiusDeg = radiusKm / 111;

    const libraries = await queryOverpass(lat, lng, radiusDeg);

    // Store in cache
    cache.set(cacheKey, { data: libraries, timestamp: Date.now() });

    // Cleanup stale cache entries (simple LRU-lite)
    if (cache.size > 100) {
      const oldest = [...cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, 20)
        .map(([k]) => k);
      oldest.forEach((k) => cache.delete(k));
    }

    return NextResponse.json({
      libraries,
      total: libraries.length,
      source: 'overpass',
      searchArea: { lat, lng, radiusKm },
    });
  } catch (error) {
    console.error('[Real Libraries] Overpass API error:', error.message);

    // Graceful degradation — return empty list, not 500
    return NextResponse.json(
      {
        libraries: [],
        total: 0,
        source: 'overpass',
        error: 'Could not fetch real library data. This is non-critical.',
        detail: error.message,
      },
      { status: 200 } // intentional 200 — caller should handle empty array
    );
  }
}
