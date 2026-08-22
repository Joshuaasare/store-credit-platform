// Geolocation via expo-location. Call only from a user gesture (button tap),
// never on mount. Foreground only — no background tracking.

import * as Location from "expo-location";

export interface Coords {
  lat: number;
  lng: number;
}

export class GeolocationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeolocationUnavailableError";
  }
}

export class GeolocationDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeolocationDeniedError";
  }
}

export async function getCurrentPosition(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new GeolocationDeniedError(
      "Location permission denied. Search or drag the map instead.",
    );
  }
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (err) {
    throw new GeolocationUnavailableError(
      err instanceof Error ? err.message : "Could not get your location.",
    );
  }
}