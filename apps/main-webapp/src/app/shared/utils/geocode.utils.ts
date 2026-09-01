// Keyless geocoding via Photon (Komoot, OSM data). No API key, no billing.
// Forward: https://photon.komoot.io/api/?q=...&limit=10  (optional &lat=&lon= to bias nearby)
// Reverse: https://photon.komoot.io/reverse?lon=..&lat=..
// Coordinates come back as [lon, lat] — swap when storing.
// Photon coverage is uneven (sparse for informal/vernacular place names), so
// `searchPlaces` falls back to Nominatim (same OSM data, different matcher,
// 1 req/sec policy — the browser's Referer header satisfies identification).

export interface GeoResult {
  lat: number;
  lng: number;
  place_id: string | null;
  label: string;
}

interface PhotonProperties {
  osm_id?: number;
  osm_type?: "N" | "W" | "R";
  name?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number]; type: string };
  properties: PhotonProperties;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

// OSM has no Google-style place_id; the stable portable id is `osm_type:osm_id`.
export function formatPlaceId(
  osmType: string | undefined,
  osmId: number | undefined,
): string | null {
  if (!osmType || osmId == null) return null;
  return `${osmType}:${osmId}`;
}

function buildLabel(p: PhotonProperties): string {
  const head = p.name ?? p.street ?? p.city ?? null;
  const tail = [p.postcode, p.city, p.state, p.country]
    .filter((x) => !!x && x !== head)
    .join(", ");
  if (!head && !tail) return "Dropped pin";
  return tail ? `${head}, ${tail}` : (head ?? tail);
}

function toGeoResult(f: PhotonFeature): GeoResult {
  const [lng, lat] = f.geometry.coordinates;
  return {
    lat,
    lng,
    place_id: formatPlaceId(f.properties.osm_type, f.properties.osm_id),
    label: buildLabel(f.properties),
  };
}

export async function photonSearch(
  query: string,
  bias?: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({ q, limit: "10" });
  if (bias) {
    params.set("lat", String(bias.lat));
    params.set("lon", String(bias.lng));
  }
  const res = await fetch(
    `https://photon.komoot.io/api/?${params.toString()}`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = (await res.json()) as PhotonResponse;
  return (data.features ?? []).map(toGeoResult);
}

export async function photonReverse(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
  });
  const res = await fetch(
    `https://photon.komoot.io/reverse?${params.toString()}`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);
  const data = (await res.json()) as PhotonResponse;
  const feature = data.features?.[0];
  if (!feature) {
    return { lat, lng, place_id: null, label: "Dropped pin" };
  }
  return toGeoResult(feature);
}

// Nominatim fallback — same OSM data, different matcher. Its osm_type is
// lowercase ("node"/"way"/"relation"), mapped to the N/W/R form so place_id
// stays consistent with Photon's. Browser fetch sends a Referer automatically,
// which satisfies Nominatim's identification requirement (no UA needed).
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  osm_type?: string;
  osm_id?: number;
}

function nominatimOsmType(t: string | undefined): "N" | "W" | "R" | null {
  if (t === "node") return "N";
  if (t === "way") return "W";
  if (t === "relation") return "R";
  return null;
}

async function nominatimSearch(
  query: string,
  bias?: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    limit: "10",
    addressdetails: "1",
  });
  if (bias) {
    params.set("lat", String(bias.lat));
    params.set("lon", String(bias.lng));
  }
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Nominatim failed: ${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  return (data ?? []).map((r) => {
    const t = nominatimOsmType(r.osm_type);
    return {
      lat: Number(r.lat),
      lng: Number(r.lon),
      place_id: t && r.osm_id != null ? `${t}:${r.osm_id}` : null,
      label: r.display_name || "Dropped pin",
    };
  });
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

// Photon first; if it returns nothing, try Nominatim. Non-abort errors from
// either are swallowed (the caller just shows "no match") so a flaky geocoder
// never blocks the map/drag fallback.
export async function searchPlaces(
  query: string,
  bias?: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<GeoResult[]> {
  try {
    const photon = await photonSearch(query, bias, signal);
    if (photon.length > 0) return photon;
  } catch (e) {
    if (isAbort(e)) throw e;
  }
  try {
    return await nominatimSearch(query, bias, signal);
  } catch (e) {
    if (isAbort(e)) throw e;
    return [];
  }
}

// Typeahead helper: debounces a search query and aborts the in-flight request
// when a newer one starts.
export function makeDebouncedSearcher(delayMs = 350) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  return (query: string, bias?: { lat: number; lng: number }) =>
    new Promise<GeoResult[]>((resolve, reject) => {
      if (timer) clearTimeout(timer);
      if (controller) controller.abort();
      controller = new AbortController();
      const local = controller;
      timer = setTimeout(() => {
        searchPlaces(query, bias, local.signal).then(resolve).catch(reject);
      }, delayMs);
    });
}