'use client';

import { useEffect, useRef } from 'react';

/**
 * MapView — Leaflet.js + OpenStreetMap tiles (free, no API key)
 *
 * Props:
 *   userLocation  { lat, lng }
 *   stores        Array<StoreObject>  — merged list (isReal: true = OSM library)
 *   onStoreClick  (store) => void
 *   height        string              — CSS height (default '450px')
 */
export default function MapView({
  userLocation,
  stores = [],
  onStoreClick,
  height = '450px',
}) {
  const containerRef   = useRef(null);
  const mapRef         = useRef(null);   // Leaflet map instance
  const markersRef     = useRef([]);     // store markers (so we can clear them)

  // ── Init map once userLocation is available ────────────────────────────────
  useEffect(() => {
    if (!userLocation || !containerRef.current) return;

    let map = mapRef.current;

    const setupMap = async () => {
      const L = (await import('leaflet')).default;

      // ── Guard against double-init (React StrictMode / tab re-mount) ────────
      // Leaflet stamps _leaflet_id onto the div; if it's already there, the map
      // object must already exist — just centre it and return.
      if (containerRef.current._leaflet_id) {
        if (map) map.setView([userLocation.lat, userLocation.lng], map.getZoom());
        return;
      }

      // Fix broken default icon paths in Next.js webpack bundler
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      map = L.map(containerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 13,
        zoomControl: true,
      });
      mapRef.current = map;

      // OpenStreetMap tiles — completely free
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // ── User location dot ─────────────────────────────────────────────────
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:16px;height:16px;
          background:#4f46e5;border:3px solid white;border-radius:50%;
          box-shadow:0 0 0 5px rgba(79,70,229,0.25);
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong>📍 You are here</strong>');

      // Render initial store markers
      renderMarkers(L, map, stores, markersRef, onStoreClick);
      fitBounds(L, map, userLocation, stores);
    };

    setupMap();

    // Cleanup: remove map when component unmounts (tab switch, etc.)
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = [];
      }
    };
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-render markers when stores list changes ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    const reRenderMarkers = async () => {
      const L = (await import('leaflet')).default;

      // Clear previous store markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      renderMarkers(L, map, stores, markersRef, onStoreClick);
      fitBounds(L, map, userLocation, stores);
    };

    reRenderMarkers();
  }, [stores]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div
        ref={containerRef}
        id="libhub-map"
        style={{ height, width: '100%', borderRadius: '12px', zIndex: 0 }}
      />
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build Leaflet DivIcon for a store.
 * Amber 🏪 for platform DB stores, green 🏛️ for real OSM libraries.
 */
function makeStoreIcon(L, isReal) {
  const bg    = isReal ? '#10b981' : '#f59e0b';
  const emoji = isReal ? '🏛️'      : '🏪';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;background:${bg};
      border:3px solid white;border-radius:50%;
      box-shadow:0 2px 10px rgba(0,0,0,.3);
      display:flex;align-items:center;justify-content:center;font-size:14px;
    ">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

function renderMarkers(L, map, stores, markersRef, onStoreClick) {
  // Expose click bridge for popup buttons
  if (onStoreClick) {
    window.__libhub_storeClick = (id) => {
      const store = stores.find((s) => String(s._id) === id);
      if (store) onStoreClick(store);
    };
  }

  stores.forEach((store) => {
    const coords = store.location?.coordinates;
    if (!coords || coords.length < 2) return;

    const [lng, lat] = coords;
    const isReal = store.isReal === true;

    const distText = store.distanceKm != null
      ? `<span style="color:#6b7280;font-size:12px;">📍 ${store.distanceKm} km away</span><br/>`
      : '';

    const openText = !isReal
      ? `<span style="font-size:12px;color:${store.isOpenToday ? '#16a34a' : '#dc2626'}">
          ${store.isOpenToday ? '✅ Open Today' : '❌ Closed Today'}
        </span><br/>`
      : '';

    const typeLabel = isReal
      ? '<span style="font-size:11px;background:#d1fae5;color:#065f46;padding:1px 6px;border-radius:99px;font-weight:600;">🏛️ Public Library</span>'
      : '<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px;font-weight:600;">🏪 Library Store</span>';

    const bookCountText = store.bookCount != null
      ? `<span style="font-size:12px;color:#4f46e5;">📖 ${store.bookCount} books available</span><br/>`
      : '';

    const websiteText = store.website
      ? `<a href="${store.website}" target="_blank" rel="noopener" style="font-size:12px;color:#4f46e5;">🔗 Website</a><br/>`
      : '';

    const viewBooksBtn = !isReal
      ? `<button
          onclick="window.__libhub_storeClick && window.__libhub_storeClick('${store._id}')"
          style="margin-top:6px;padding:4px 12px;background:#4f46e5;color:white;
            border:none;border-radius:6px;cursor:pointer;font-size:12px;">
          View Books
        </button>`
      : '';

    const popupHtml = `
      <div style="min-width:190px;font-family:system-ui;line-height:1.6">
        ${typeLabel}<br/>
        <strong style="font-size:14px">${store.storeName}</strong><br/>
        <span style="color:#6b7280;font-size:12px">${[store.address, store.city].filter(Boolean).join(', ')}</span><br/>
        ${distText}${openText}${bookCountText}${websiteText}${viewBooksBtn}
      </div>
    `;

    const marker = L.marker([lat, lng], { icon: makeStoreIcon(L, isReal) })
      .addTo(map)
      .bindPopup(popupHtml, { maxWidth: 240 });

    markersRef.current.push(marker);
  });
}

function fitBounds(L, map, userLocation, stores) {
  const points = [[userLocation.lat, userLocation.lng]];
  stores.forEach((s) => {
    const c = s.location?.coordinates;
    if (c?.length === 2) points.push([c[1], c[0]]);
  });
  if (points.length > 1) {
    map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
  }
}
