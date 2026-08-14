import mapboxgl from "mapbox-gl";

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim();

if (accessToken) {
  mapboxgl.accessToken = accessToken;
}

const requireAccessToken = () => {
  if (!accessToken) {
    throw new Error("VITE_MAPBOX_ACCESS_TOKEN is required for map features");
  }
  return accessToken;
};

const parseResponse = async (response, fallbackMessage) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || fallbackMessage);
  }
  return body;
};

export const reverseGeocode = async (longitude, latitude) => {
  const params = new URLSearchParams({
    longitude: String(longitude),
    latitude: String(latitude),
    access_token: requireAccessToken(),
  });
  const response = await fetch(
    `https://api.mapbox.com/search/geocode/v6/reverse?${params}`,
  );
  const body = await parseResponse(response, "Unable to resolve this location");
  const feature = body.features?.[0];

  return (
    feature?.properties?.full_address ||
    feature?.properties?.place_formatted ||
    feature?.properties?.name ||
    feature?.place_name ||
    ""
  );
};

export const getCurrentPosition = (options = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lng: coords.longitude, lat: coords.latitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000, ...options },
    );
  });

export const getRoute = async (origin, destination, profile = "driving") => {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    access_token: requireAccessToken(),
    geometries: "geojson",
    overview: "full",
    steps: "true",
  });
  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?${params}`,
  );
  const body = await parseResponse(response, "Unable to calculate directions");

  return body.routes?.[0] || null;
};

export const formatDistance = (meters = 0) =>
  meters < 1_000
    ? `${Math.round(meters)} m`
    : `${(meters / 1_000).toFixed(meters < 10_000 ? 1 : 0)} km`;

export const formatDuration = (seconds = 0) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
};

export default mapboxgl;
