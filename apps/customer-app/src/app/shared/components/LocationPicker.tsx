import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Region } from "react-native-maps";
import { useThemeTokens } from "../theme/ThemeContext";
import { GeoResult, photonReverse, searchPlaces } from "../utils/geocode";
import {
  Coords,
  GeolocationDeniedError,
  GeolocationUnavailableError,
  getCurrentPosition,
} from "../utils/geolocation";

export interface LocationValue {
  latitude: number;
  longitude: number;
  place_id: string | null;
}

interface LocationPickerProps {
  value?: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
}

const DEFAULT_REGION: Region = {
  latitude: 5.6037,
  longitude: -0.187,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const LAT_LNG_DELTA = 0.01;

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const theme = useThemeTokens();
  const initial = value ?? null;
  const [region, setRegion] = useState<Region>(
    initial
      ? {
          latitude: initial.latitude,
          longitude: initial.longitude,
          latitudeDelta: LAT_LNG_DELTA,
          longitudeDelta: LAT_LNG_DELTA,
        }
      : DEFAULT_REGION,
  );
  const [marker, setMarker] = useState<LocationValue | null>(initial);
  const [label, setLabel] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseController = useRef<AbortController | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchController = useRef<AbortController | null>(null);
  // Why: MapView with `initialRegion` is uncontrolled — setRegion updates state
  // but never moves the view. animateToRegion is the imperative way to recenter.
  const mapRef = useRef<MapView>(null);

  const reverseAndEmit = useCallback(
    (lat: number, lng: number) => {
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
      if (reverseController.current) reverseController.current.abort();
      reverseTimer.current = setTimeout(() => {
        const controller = new AbortController();
        reverseController.current = controller;
        photonReverse(lat, lng, controller.signal)
          .then((r) => {
            const resolved = r ?? {
              lat,
              lng,
              place_id: null,
              label: "Dropped pin",
            };
            setLabel(resolved.label);
            onChange({
              latitude: lat,
              longitude: lng,
              place_id: resolved.place_id,
            });
          })
          .catch(() => {
            setLabel("Dropped pin");
            onChange({ latitude: lat, longitude: lng, place_id: null });
          });
      }, 500);
    },
    [onChange],
  );

  const placeAt = useCallback(
    (lat: number, lng: number) => {
      setError(null);
      const next: Region = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: LAT_LNG_DELTA,
        longitudeDelta: LAT_LNG_DELTA,
      };
      setRegion(next);
      setMarker({ latitude: lat, longitude: lng, place_id: null });
      mapRef.current?.animateToRegion(next, 300);
      reverseAndEmit(lat, lng);
    },
    [reverseAndEmit],
  );

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
      const bias = marker
        ? { lat: marker.latitude, lng: marker.longitude }
        : undefined;
      searchPlaces(q, bias, controller.signal)
        .then((rs) => setResults(rs))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, marker]);

  const selectResult = (r: GeoResult) => {
    setError(null);
    const next: Region = {
      latitude: r.lat,
      longitude: r.lng,
      latitudeDelta: LAT_LNG_DELTA,
      longitudeDelta: LAT_LNG_DELTA,
    };
    setMarker({ latitude: r.lat, longitude: r.lng, place_id: r.place_id });
    setLabel(r.label);
    setRegion(next);
    mapRef.current?.animateToRegion(next, 300);
    setQuery("");
    setResults([]);
    onChange({ latitude: r.lat, longitude: r.lng, place_id: r.place_id });
  };

  const useMyLocation = async () => {
    setError(null);
    setLocating(true);
    try {
      const coords: Coords = await getCurrentPosition();
      placeAt(coords.lat, coords.lng);
    } catch (err) {
      setError(
        err instanceof GeolocationDeniedError ||
          err instanceof GeolocationUnavailableError
          ? err.message
          : "Could not get your location.",
      );
    } finally {
      setLocating(false);
    }
  };

  const clear = () => {
    setMarker(null);
    setLabel(null);
    setQuery("");
    setResults([]);
    setError(null);
    onChange(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.colors.surfaceInput,
              borderColor: theme.colors.surfaceBorder,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={16}
            color={theme.colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search a place…"
            placeholderTextColor={theme.colors.textPlaceholder}
            autoCorrect={false}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            importantForAutofill="no"
            style={{
              flex: 1,
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 15,
            }}
          />
          {searching && (
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
          )}
        </View>
        <TouchableOpacity
          onPress={useMyLocation}
          disabled={locating}
          activeOpacity={0.7}
          style={[
            styles.myLocationBtn,
            {
              backgroundColor: theme.colors.surfaceInput,
              borderColor: theme.colors.surfaceBorder,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          {locating ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name="navigate" size={18} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {results.length > 0 && (
        <View
          style={[
            styles.results,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.surfaceBorder,
              borderRadius: theme.radii.md,
            },
          ]}
        >
          <FlatList
            data={results}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item, i) =>
              `${item.place_id ?? ""}-${item.lat}-${item.lng}-${i}`
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => selectResult(item)}
                style={styles.resultRow}
              >
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={theme.colors.textMuted}
                />
                <Text
                  numberOfLines={2}
                  style={{
                    flex: 1,
                    color: theme.colors.text,
                    fontFamily: theme.typography.fontFamilyRegular,
                    fontSize: 14,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
      {query.trim().length >= 3 && !searching && results.length === 0 && (
        <Text
          style={{
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 12,
          }}
        >
          No match — drag the map or use my location.
        </Text>
      )}

      <View
        style={[
          styles.mapWrap,
          {
            borderColor: theme.colors.surfaceBorder,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onPress={(e) =>
            placeAt(
              e.nativeEvent.coordinate.latitude,
              e.nativeEvent.coordinate.longitude,
            )
          }
        >
          {marker && (
            <Marker
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              draggable
              pinColor={theme.colors.primary}
              onDragEnd={(e) =>
                placeAt(
                  e.nativeEvent.coordinate.latitude,
                  e.nativeEvent.coordinate.longitude,
                )
              }
            />
          )}
        </MapView>
      </View>

      <View style={styles.readoutRow}>
        <Text
          style={{
            flex: 1,
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 12,
          }}
        >
          {label
            ? `${label}${marker ? ` · ${marker.latitude.toFixed(4)}, ${marker.longitude.toFixed(4)}` : ""}`
            : marker
              ? `${marker.latitude.toFixed(4)}, ${marker.longitude.toFixed(4)}`
              : "No location set — search, drag, or use my location."}
        </Text>
        {marker && (
          <TouchableOpacity
            onPress={clear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.clearBtn}>
              <Ionicons name="close" size={14} color={theme.colors.textMuted} />
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 12,
                  marginLeft: 2,
                }}
              >
                Clear
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text
          style={{
            color: theme.colors.primary,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 12,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 44,
  },
  searchIcon: { marginRight: 6 },
  myLocationBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  results: { maxHeight: 200, borderWidth: 1, overflow: "hidden" },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapWrap: { borderWidth: 1, overflow: "hidden" },
  map: { height: 240, width: "100%" },
  readoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clearBtn: { flexDirection: "row", alignItems: "center" },
});
