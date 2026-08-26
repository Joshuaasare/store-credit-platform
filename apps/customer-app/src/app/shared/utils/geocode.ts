// Keyless geocoding via Photon (Komoot, OSM data). Mirrors the webapp's
// geocode.utils.ts — same API, same place_id format (osm_type:osm_id).
// Coordinates come back as [lon, lat] — swap when storing.
// Photon coverage is uneven, so `searchPlaces` falls back to Nominatim (same
// OSM data, different matcher). RN fetch sends no Referer, so Nominatim gets
// a User-Agent header to satisfy its usage policy.

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
  const params = new URLSearchParams({ q, limit: "20" });
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
  return (data.features ?? [])
    .filter((f) => f.properties.country === "Ghana")
    .map(toGeoResult);
}

export async function photonReverse(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng) });
  const res = await fetch(
    `https://photon.komoot.io/reverse?${params.toString()}`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Reverse geocoding failed: ${res.status}`);
  const data = (await res.json()) as PhotonResponse;
  const feature = data.features?.[0];
  if (!feature) return { lat, lng, place_id: null, label: "Dropped pin" };
  return toGeoResult(feature);
}

// Nominatim fallback — same OSM data, different matcher. osm_type is lowercase
// ("node"/"way"/"relation"), mapped to N/W/R so place_id matches Photon's.
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
    countrycodes: "gh",
  });
  if (bias) {
    params.set("lat", String(bias.lat));
    params.set("lon", String(bias.lng));
  }
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      signal,
      headers: {
        Accept: "application/json",
        // RN fetch sends no Referer; a User-Agent satisfies Nominatim's policy.
        "User-Agent": "StoreCredit-CustomerApp/1.0",
      },
    },
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

// Default location bias — Ghana's geographic center (Accra). Used when the
// caller has no marker to bias toward, so Ghanaian matches rank above
// same-named places abroad before the country filter is applied.
export const GHANA_CENTER = { lat: 5.6037, lng: -0.187 };

// Photon first; if it returns nothing (or nothing in Ghana), try Nominatim.
// Non-abort errors are swallowed so a flaky geocoder never blocks the
// map/drag fallback.
export async function searchPlaces(
  query: string,
  bias?: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<GeoResult[]> {
  const effectiveBias = bias ?? GHANA_CENTER;
  try {
    const photon = await photonSearch(query, effectiveBias, signal);
    if (photon.length > 0) return photon;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
  }
  try {
    return await nominatimSearch(query, effectiveBias, signal);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    return [];
  }
}