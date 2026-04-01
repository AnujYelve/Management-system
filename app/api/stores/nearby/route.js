export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Store from '@/models/Store.js';
import Book from '@/models/Book.js';
import { haversineDistance } from '@/lib/geocoding.js';

/**
 * Fetch real public libraries from OpenStreetMap Overpass API.
 * Returns an array of normalised store-like objects with isReal: true.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusDeg  ~0.15° ≈ 15–17 km
 */
async function fetchRealLibraries(lat, lng, radiusDeg = 0.15) {
  const minLat = lat - radiusDeg;
  const maxLat = lat + radiusDeg;
  const minLng = lng - radiusDeg;
  const maxLng = lng + radiusDeg;

  // Overpass QL — fetch nodes AND ways tagged as library
  const query = `[out:json][timeout:10];
(
  node["amenity"="library"](${minLat},${minLng},${maxLat},${maxLng});
  way["amenity"="library"](${minLat},${minLng},${maxLat},${maxLng});
);
out center;`;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'LibraryHub-App/1.0 (library management system)',
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(12000), // 12s hard timeout
  });

  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

  const data = await res.json();

  // Normalise Overpass elements into our store shape
  return (data.elements || [])
    .map((el) => {
      // Nodes have lat/lon directly; ways have a "center" object
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;

      if (!elLat || !elLng) return null;

      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || 'Public Library';

      // Build a human-readable address from available tags
      const addrParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
      ].filter(Boolean);
      const address = addrParts.length > 0 ? addrParts.join(' ') : tags['addr:full'] || '';
      const city =
        tags['addr:city'] ||
        tags['addr:town'] ||
        tags['addr:village'] ||
        tags['addr:state'] ||
        '';

      return {
        _id: `osm-${el.type}-${el.id}`,  // synthetic ID for UI keys
        storeName: name,
        address,
        city,
        timings: tags.opening_hours || '',
        isOpenToday: true,              // we don't parse opening_hours deeply
        storeImage: '',
        location: {
          type: 'Point',
          coordinates: [elLng, elLat]
        },
        isReal: true,                   // ← flag for UI differentiation
        sourceType: 'osm',
        osmId: el.id,
        osmType: el.type,
        website: tags.website || tags.url || '',
        phone: tags.phone || tags['contact:phone'] || '',
      };
    })
    .filter(Boolean);
}

/**
 * GET /api/stores/nearby
 *
 * Query params:
 *   lat         (required)
 *   lng         (required)
 *   maxDistance (optional, metres)  default 20 000 (20 km)
 *   limit       (optional)          default 30
 *   includeReal (optional, bool)    default true — set false to skip Overpass
 *
 * Returns a merged, distance-sorted list of:
 *   - DB stores  ( isReal: false )
 *   - OSM public libraries ( isReal: true )
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const maxDistance = parseInt(searchParams.get('maxDistance') || '20000');
    const limit = parseInt(searchParams.get('limit') || '30');
    const includeReal = searchParams.get('includeReal') !== 'false';

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'lat and lng query parameters are required' },
        { status: 400 }
      );
    }

    // ── 1. DB stores (MongoDB $near) ────────────────────────────────────────
    await connectDB();

    let dbStores = [];
    try {
      const raw = await Store.find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: maxDistance,
          },
        },
      })
        .populate('ownerId', 'name email username isBlocked')
        .limit(limit);

      // Enrich with distance + bookCount + isReal flag
      dbStores = await Promise.all(
        raw
          .filter((s) => s.ownerId && !s.ownerId.isBlocked)
          .map(async (store) => {
            const coords = store.location?.coordinates;
            const distanceKm =
              coords?.length === 2
                ? haversineDistance({ lat, lng }, { lat: coords[1], lng: coords[0] })
                : null;

            const bookCount = await Book.countDocuments({
              storeId: store._id,
              availableCopies: { $gt: 0 },
            });

            return {
              ...store.toObject(),
              distanceKm,
              bookCount,
              isReal: false,
              sourceType: 'db',
            };
          })
      );
    } catch (dbErr) {
      console.warn('[Nearby] DB query failed (non-fatal):', dbErr.message);
    }

    // ── 2. Real libraries (Overpass API) ────────────────────────────────────
    let realLibraries = [];
    if (includeReal) {
      try {
        // Radius in degrees (~0.15° ≈ 15 km)
        const radiusDeg = (maxDistance / 1000) / 111;
        const raw = await fetchRealLibraries(lat, lng, Math.min(radiusDeg, 0.25));

        // Compute Haversine distances and filter within maxDistance
        realLibraries = raw
          .map((lib) => {
            const [libLng, libLat] = lib.location.coordinates;
            const distanceKm = haversineDistance({ lat, lng }, { lat: libLat, lng: libLng });
            return { ...lib, distanceKm, bookCount: null };
          })
          .filter((lib) => lib.distanceKm <= maxDistance / 1000);
      } catch (overpassErr) {
        // Overpass failure is non-fatal — we still return DB stores
        console.warn('[Nearby] Overpass API failed (non-fatal):', overpassErr.message);
      }
    }

    // ── 3. Deduplicate (avoid showing OSM library already in DB) ────────────
    // If a DB store name closely matches an OSM library name, prefer the DB version
    const dbNames = new Set(dbStores.map((s) => s.storeName?.toLowerCase().trim()));
    const filteredReal = realLibraries.filter(
      (lib) => !dbNames.has(lib.storeName?.toLowerCase().trim())
    );

    // ── 4. Merge + sort by distance ─────────────────────────────────────────
    const merged = [...dbStores, ...filteredReal].sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return NextResponse.json({
      stores: merged,
      total: merged.length,
      dbCount: dbStores.length,
      realCount: filteredReal.length,
      userLocation: { lat, lng },
      maxDistanceKm: maxDistance / 1000,
    });
  } catch (error) {
    console.error('[Nearby Stores] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
