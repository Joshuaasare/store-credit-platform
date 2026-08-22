// Thin wrapper over the browser Geolocation API. Call only from a user gesture
// (button click) — never on mount. Requires HTTPS in production (localhost exempt).

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

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new GeolocationUnavailableError("Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new GeolocationDeniedError(
              "Location permission denied. Search or drag the map instead.",
            ),
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new GeolocationUnavailableError("Location is unavailable."));
        } else if (err.code === err.TIMEOUT) {
          reject(new GeolocationUnavailableError("Location request timed out."));
        } else {
          reject(new GeolocationUnavailableError(err.message));
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}