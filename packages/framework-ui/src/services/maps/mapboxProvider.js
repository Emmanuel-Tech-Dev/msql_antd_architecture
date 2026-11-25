import mapboxgl, {
  mapboxAccessToken,
  getRoute as requestMapboxRoute,
  reverseGeocode as requestMapboxReverseGeocode,
} from "../../utils/mapbox";
import { normalizePosition, normalizeTravelMode } from "./coordinates";

const PROVIDER = "mapbox";
const ROUTE_SOURCE = "use-map-route";
const ROUTE_LAYER = "use-map-route";

const waitForLoad = (map) =>
  new Promise((resolve, reject) => {
    if (map.loaded()) {
      resolve();
      return;
    }

    const onLoad = () => {
      map.off("error", onError);
      resolve();
    };
    const onError = (event) => {
      map.off("load", onLoad);
      reject(event?.error || new Error("Mapbox failed to load"));
    };

    map.once("load", onLoad);
    map.once("error", onError);
  });

const normalizeRouteResult = (raw) => ({
  provider: PROVIDER,
  raw,
  geometry: raw.geometry,
  distanceMeters: raw.distance ?? 0,
  durationSeconds: raw.duration ?? 0,
  steps: (raw.legs?.[0]?.steps || []).map((step) => ({
    instruction: step.maneuver?.instruction || "Continue",
    distanceMeters: step.distance ?? 0,
    durationSeconds: step.duration ?? 0,
    type: step.maneuver?.type,
  })),
});

export const mapboxProvider = {
  name: PROVIDER,

  async create({ container, center, zoom, options = {} }) {
    if (!mapboxAccessToken()) {
      throw new Error("config.mapboxAccessToken is required to use Mapbox");
    }

    const map = new mapboxgl.Map({
      container,
      center: [center.lng, center.lat],
      style: options.style || "mapbox://styles/mapbox/dark-v11",
      zoom,
      ...options.mapOptions,
    });

    if (options.navigationControl !== false) {
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
    }

    await waitForLoad(map);

    let behaviors = {};
    let markers = [];
    let routeRequestId = 0;

    const onMapClick = (event) => {
      behaviors.onMapClick?.({
        event,
        position: { lat: event.lngLat.lat, lng: event.lngLat.lng },
        provider: PROVIDER,
      });
    };
    map.on("click", onMapClick);

    const clearMarkers = () => {
      markers.forEach(({ instance }) => instance.remove());
      markers = [];
    };

    const clearRoute = () => {
      routeRequestId += 1;
      if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
      if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
    };

    const controller = {
      setBehaviors(nextBehaviors = {}) {
        behaviors = nextBehaviors;
      },

      setCenter(position, movement = {}) {
        const next = normalizePosition(position);
        const method = movement.animate === false ? "jumpTo" : "easeTo";
        map[method]({
          center: [next.lng, next.lat],
          ...(movement.zoom === undefined ? {} : { zoom: movement.zoom }),
        });
      },

      setZoom(nextZoom) {
        map.setZoom(nextZoom);
      },

      setMarkers(definitions = []) {
        clearMarkers();
        markers = definitions.map((definition, index) => {
          const position = normalizePosition(definition.position || definition);
          const instance = new mapboxgl.Marker({
            color: definition.color || "#5e6ad2",
            draggable: Boolean(definition.draggable),
          }).setLngLat([position.lng, position.lat]);

          if (definition.popup || definition.title) {
            instance.setPopup(
              new mapboxgl.Popup({ offset: 25 }).setText(
                definition.popup || definition.title,
              ),
            );
          }

          instance.on("click", (event) => {
            behaviors.onMarkerClick?.({
              event,
              marker: definition,
              position: normalizePosition(instance.getLngLat()),
              provider: PROVIDER,
            });
          });
          instance.on("dragend", (event) => {
            behaviors.onMarkerDragEnd?.({
              event,
              marker: definition,
              position: normalizePosition(instance.getLngLat()),
              provider: PROVIDER,
            });
          });
          instance.addTo(map);

          return { id: definition.id ?? index, instance };
        });
      },

      async setRoute(request) {
        if (!request?.origin || !request?.destination) {
          clearRoute();
          return null;
        }

        const currentRequestId = ++routeRequestId;
        const origin = normalizePosition(request.origin);
        const destination = normalizePosition(request.destination);
        const raw = await requestMapboxRoute(
          origin,
          destination,
          normalizeTravelMode(request.travelMode || request.profile),
        );

        if (currentRequestId !== routeRequestId || !raw) return null;

        const data = { type: "Feature", geometry: raw.geometry, properties: {} };
        if (map.getSource(ROUTE_SOURCE)) {
          map.getSource(ROUTE_SOURCE).setData(data);
        } else {
          map.addSource(ROUTE_SOURCE, { type: "geojson", data });
          map.addLayer({
            id: ROUTE_LAYER,
            type: "line",
            source: ROUTE_SOURCE,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": request.color || "#5e6ad2",
              "line-opacity": request.opacity ?? 0.9,
              "line-width": request.width || 4,
            },
          });
        }

        const coordinates = raw.geometry?.coordinates || [];
        if (request.fitBounds !== false && coordinates.length) {
          const bounds = coordinates.reduce(
            (result, coordinate) => result.extend(coordinate),
            new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
          );
          map.fitBounds(bounds, { padding: request.padding || 60 });
        }

        const result = normalizeRouteResult(raw);
        behaviors.onRoute?.(result);
        return result;
      },

      clearRoute,

      fitBounds(positions, fitOptions = {}) {
        const normalized = positions.map(normalizePosition);
        if (!normalized.length) return;
        const first = normalized[0];
        const bounds = normalized.reduce(
          (result, position) => result.extend([position.lng, position.lat]),
          new mapboxgl.LngLatBounds([first.lng, first.lat], [first.lng, first.lat]),
        );
        map.fitBounds(bounds, { padding: 60, ...fitOptions });
      },

      async reverseGeocode(position) {
        const normalized = normalizePosition(position);
        return requestMapboxReverseGeocode(normalized.lng, normalized.lat);
      },

      resize() {
        map.resize();
      },

      getInstance() {
        return map;
      },

      destroy() {
        routeRequestId += 1;
        clearMarkers();
        map.off("click", onMapClick);
        map.remove();
      },
    };

    return controller;
  },
};
