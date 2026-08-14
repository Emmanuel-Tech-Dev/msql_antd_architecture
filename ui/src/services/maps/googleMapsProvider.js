import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { normalizePosition, normalizeTravelMode } from "./coordinates";

const PROVIDER = "google";
let loaderConfiguration;

const configureLoader = (options) => {
  const key = (options.apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY)?.trim();
  if (!key) {
    throw new Error("VITE_GOOGLE_MAPS_API_KEY is required to use Google Maps");
  }

  const configuration = {
    key,
    v: options.version || "weekly",
    ...(options.language ? { language: options.language } : {}),
    ...(options.region ? { region: options.region } : {}),
  };
  const signature = JSON.stringify(configuration);

  if (loaderConfiguration && loaderConfiguration !== signature) {
    throw new Error("Google Maps loader options cannot change after initialization");
  }
  if (!loaderConfiguration) {
    setOptions(configuration);
    loaderConfiguration = signature;
  }
};

const makeMarkerContent = (definition) => {
  const element = document.createElement("div");
  element.setAttribute("aria-label", definition.title || "Map marker");
  Object.assign(element.style, {
    width: "18px",
    height: "18px",
    border: "3px solid white",
    borderRadius: "999px",
    background: definition.color || "#5e6ad2",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.35)",
  });
  return element;
};

const normalizeGoogleRoute = (raw) => ({
  provider: PROVIDER,
  raw,
  geometry: (raw.path || []).map((point) => ({ lat: point.lat(), lng: point.lng() })),
  distanceMeters: raw.distanceMeters ?? 0,
  durationSeconds: (raw.durationMillis ?? 0) / 1_000,
  steps: (raw.legs?.[0]?.steps || []).map((step) => ({
    instruction:
      step.navigationInstruction?.instructions ||
      step.instructions ||
      "Continue",
    distanceMeters: step.distanceMeters ?? 0,
    durationSeconds: (step.durationMillis ?? 0) / 1_000,
  })),
});

export const googleMapsProvider = {
  name: PROVIDER,

  async create({ container, center, zoom, options = {} }) {
    configureLoader(options);
    const [{ Map, InfoWindow, LatLngBounds }, { AdvancedMarkerElement }] =
      await Promise.all([importLibrary("maps"), importLibrary("marker")]);

    const map = new Map(container, {
      center,
      zoom,
      mapId:
        options.mapId || import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID",
      ...options.mapOptions,
    });

    let behaviors = {};
    let markers = [];
    let polylines = [];
    let routeRequestId = 0;

    const mapClickListener = map.addListener("click", (event) => {
      if (!event.latLng) return;
      behaviors.onMapClick?.({
        event,
        position: { lat: event.latLng.lat(), lng: event.latLng.lng() },
        provider: PROVIDER,
      });
    });

    const clearMarkers = () => {
      markers.forEach(({ instance }) => {
        instance.map = null;
      });
      markers = [];
    };

    const clearRoute = () => {
      routeRequestId += 1;
      polylines.forEach((polyline) => polyline.setMap(null));
      polylines = [];
    };

    const controller = {
      setBehaviors(nextBehaviors = {}) {
        behaviors = nextBehaviors;
      },

      setCenter(position, movement = {}) {
        const next = normalizePosition(position);
        map.setCenter(next);
        if (movement.zoom !== undefined) map.setZoom(movement.zoom);
      },

      setZoom(nextZoom) {
        map.setZoom(nextZoom);
      },

      setMarkers(definitions = []) {
        clearMarkers();
        markers = definitions.map((definition, index) => {
          const position = normalizePosition(definition.position || definition);
          const instance = new AdvancedMarkerElement({
            map,
            position,
            title: definition.title,
            content: makeMarkerContent(definition),
            gmpDraggable: Boolean(definition.draggable),
          });

          instance.addListener("click", (event) => {
            if (definition.popup) {
              const content = document.createElement("div");
              content.textContent = definition.popup;
              new InfoWindow({ content }).open({ anchor: instance, map });
            }
            behaviors.onMarkerClick?.({
              event,
              marker: definition,
              position: normalizePosition(instance.position),
              provider: PROVIDER,
            });
          });
          instance.addListener("dragend", (event) => {
            const position = event.latLng
              ? { lat: event.latLng.lat(), lng: event.latLng.lng() }
              : normalizePosition(instance.position);
            behaviors.onMarkerDragEnd?.({
              event,
              marker: definition,
              position,
              provider: PROVIDER,
            });
          });

          return { id: definition.id ?? index, instance };
        });
      },

      async setRoute(request) {
        if (!request?.origin || !request?.destination) {
          clearRoute();
          return null;
        }

        const currentRequestId = ++routeRequestId;
        polylines.forEach((polyline) => polyline.setMap(null));
        polylines = [];

        const { Route } = await importLibrary("routes");
        const travelMode = normalizeTravelMode(
          request.travelMode || request.profile,
        ).toUpperCase();
        const { routes = [] } = await Route.computeRoutes({
          origin: normalizePosition(request.origin),
          destination: normalizePosition(request.destination),
          travelMode,
          fields: ["path", "distanceMeters", "durationMillis", "viewport", "legs"],
        });
        const raw = routes[0];
        if (currentRequestId !== routeRequestId || !raw) return null;

        polylines = await Promise.resolve(
          raw.createPolylines({
            polylineOptions: {
              strokeColor: request.color || "#5e6ad2",
              strokeOpacity: request.opacity ?? 0.9,
              strokeWeight: request.width || 4,
            },
          }),
        );
        polylines.forEach((polyline) => polyline.setMap(map));
        if (request.fitBounds !== false && raw.viewport) {
          map.fitBounds(raw.viewport, request.padding || 60);
        }

        const result = normalizeGoogleRoute(raw);
        behaviors.onRoute?.(result);
        return result;
      },

      clearRoute,

      fitBounds(positions, fitOptions = {}) {
        const bounds = new LatLngBounds();
        positions.map(normalizePosition).forEach((position) => bounds.extend(position));
        if (!bounds.isEmpty()) map.fitBounds(bounds, fitOptions.padding || 60);
      },

      async reverseGeocode(position) {
        const { Geocoder } = await importLibrary("geocoding");
        const geocoder = new Geocoder();
        const { results = [] } = await geocoder.geocode({
          location: normalizePosition(position),
        });
        return results[0]?.formatted_address || "";
      },

      resize() {
        map.moveCamera({ center: map.getCenter(), zoom: map.getZoom() });
      },

      getInstance() {
        return map;
      },

      destroy() {
        routeRequestId += 1;
        clearMarkers();
        clearRoute();
        mapClickListener.remove();
      },
    };

    return controller;
  },
};
