import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import { MapPin, LocateFixed, Search, X, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  GeoResult,
  photonReverse,
  searchPlaces,
} from "../../utils/geocode.utils";
import {
  Coords,
  GeolocationDeniedError,
  GeolocationUnavailableError,
  getCurrentPosition,
  isGeolocationSupported,
} from "../../utils/geolocation.utils";

export interface LocationValue {
  latitude: number;
  longitude: number;
  place_id: string | null;
}

interface LocationPickerProps {
  value?: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
  disabled?: boolean;
}

// Self-contained marker: an inline SVG pin in the brand color. Avoids Leaflet's
// bundled image assets (which don't resolve through Vite) and any CDN dependency.
const markerIcon = L.divIcon({
  className: "sp-location-marker text-primary",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const DEFAULT_CENTER: [number, number] = [5.6037, -0.187]; // Accra
const DEFAULT_ZOOM = 12;

// Captures map clicks to place the marker.
function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

// react-leaflet's MapContainer is uncontrolled: changing the `center` prop does
// not recenter. This child imperatively flies the view to the marker whenever
// position changes (search select, my-location, drag, click). Also calls
// invalidateSize on mount + a tick later to fix the 0x0 render that happens
// while the Radix Dialog open animation is still playing.
function MapController({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map]);
  useEffect(() => {
    if (!position) return;
    map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.4 });
  }, [position, map]);
  return null;
}

export function LocationPicker({ value, onChange, disabled }: LocationPickerProps) {
  const initial = value ?? null;
  const [position, setPosition] = useState<[number, number] | null>(
    initial ? [initial.latitude, initial.longitude] : null,
  );
  const [label, setLabel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseController = useRef<AbortController | null>(null);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchController = useRef<AbortController | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (initial) return [initial.latitude, initial.longitude];
    return DEFAULT_CENTER;
  }, [initial]);

  // Reverse-geocode a position (debounced) and publish {lat,lng,place_id} upstream.
  const reverseAndEmit = (lat: number, lng: number) => {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    if (reverseController.current) reverseController.current.abort();
    reverseTimer.current = setTimeout(() => {
      const controller = new AbortController();
      reverseController.current = controller;
      photonReverse(lat, lng, controller.signal)
        .then((r) => {
          const resolved = r ?? { lat, lng, place_id: null, label: "Dropped pin" };
          setLabel(resolved.label);
          onChange({ latitude: lat, longitude: lng, place_id: resolved.place_id });
        })
        .catch(() => {
          setLabel("Dropped pin");
          onChange({ latitude: lat, longitude: lng, place_id: null });
        });
    }, 500);
  };

  // When the marker moves (drag or click), update position + reverse-geocode.
  const handleMove = (lat: number, lng: number) => {
    setError(null);
    setPosition([lat, lng]);
    reverseAndEmit(lat, lng);
  };

  // Forward search typeahead (debounced 350ms, min 3 chars).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchController.current) searchController.current.abort();
    searchTimer.current = setTimeout(() => {
      const controller = new AbortController();
      searchController.current = controller;
      const bias = position ? { lat: position[0], lng: position[1] } : undefined;
      searchPlaces(q, bias, controller.signal)
        .then((rs) => setResults(rs))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, position]);

  // Selecting a search result: forward response already carries place_id + label.
  const selectResult = (r: GeoResult) => {
    setError(null);
    setPosition([r.lat, r.lng]);
    setLabel(r.label);
    setQuery("");
    setResults([]);
    onChange({ latitude: r.lat, longitude: r.lng, place_id: r.place_id });
  };

  const useMyLocation = async () => {
    setError(null);
    if (!isGeolocationSupported()) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    try {
      const coords: Coords = await getCurrentPosition();
      handleMove(coords.lat, coords.lng);
    } catch (err) {
      if (err instanceof GeolocationDeniedError) {
        setError(err.message);
      } else if (err instanceof GeolocationUnavailableError) {
        setError(err.message);
      } else {
        setError("Could not get your location.");
      }
    } finally {
      setLocating(false);
    }
  };

  const clear = () => {
    setPosition(null);
    setLabel(null);
    setQuery("");
    setResults([]);
    setError(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="absolute left-2 top-2 z-[1000] flex w-[calc(100%-1rem)] items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              disabled={disabled}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a place…"
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
            {searching && (
              <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <button
            type="button"
            disabled={disabled || locating}
            onClick={useMyLocation}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs shadow-sm hover:bg-accent disabled:opacity-50"
            title="Use my location"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">My location</span>
          </button>
        </div>

        {results.length > 0 && (
          <ul className="absolute left-2 top-12 z-[1000] w-[calc(100%-1rem)] max-h-56 overflow-auto rounded-md border border-input bg-background shadow-md">
            {results.map((r) => (
              <li key={`${r.place_id ?? ""}-${r.lat}-${r.lng}`}>
                <button
                  type="button"
                  onClick={() => selectResult(r)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.trim().length >= 3 && !searching && results.length === 0 && (
          <p className="absolute left-2 top-12 z-[1000] w-[calc(100%-1rem)] rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground shadow-md">
            No match — drag the map or use my location.
          </p>
        )}
      </div>

      <div className="relative overflow-hidden rounded-md border border-input">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          zoomControl={false}
          style={{ height: 240, width: "100%", cursor: disabled ? "not-allowed" : "crosshair" }}
          className={disabled ? "pointer-events-none opacity-60" : ""}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ZoomControl position="bottomright" />
          <MapController position={position} />
          {position && (
            <Marker
              position={position}
              draggable={!disabled}
              icon={markerIcon}
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const ll = m.getLatLng();
                  handleMove(ll.lat, ll.lng);
                },
              }}
            />
          )}
          <ClickHandler onClick={handleMove} />
        </MapContainer>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        {position ? (
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {label
              ? `${label} · ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`
              : `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`}
          </span>
        ) : (
          <span className="text-muted-foreground">
            No location set — search, drag, or use my location.
          </span>
        )}
        {position && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}