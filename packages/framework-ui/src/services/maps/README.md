# Map provider layer

`useMap` and `MapView` keep application code independent from a map vendor. The
built-in provider names are `mapbox` and `google`.

```jsx
import { useMemo } from "react";
import { MapView } from "../../components/map";

export default function ServiceAreaMap() {
  const markers = useMemo(
    () => [
      {
        id: "office",
        position: { lat: 5.6037, lng: -0.187 },
        title: "Accra office",
        draggable: true,
      },
    ],
    [],
  );

  const behaviors = useMemo(
    () => ({
      onMapClick: ({ position }) => console.log(position),
      onMarkerDragEnd: ({ marker, position }) => console.log(marker.id, position),
      onRoute: ({ distanceMeters, durationSeconds }) =>
        console.log(distanceMeters, durationSeconds),
      onError: (error) => console.error(error),
    }),
    [],
  );

  return (
    <MapView
      provider="google"
      center={{ lat: 5.6037, lng: -0.187 }}
      zoom={12}
      markers={markers}
      behaviors={behaviors}
      style={{ height: 420 }}
    />
  );
}
```

The optional `route` prop accepts `origin`, `destination`, `travelMode`, route
color/width/opacity, and `fitBounds`. A `MapView` ref exposes `setCenter`,
`setZoom`, `setMarkers`, `setRoute`, `clearRoute`, `fitBounds`,
`reverseGeocode`, `getCurrentPosition`, `resize`, `reload`, and `getInstance`.

## Adding another provider

Register an adapter before its first use:

```js
import { registerMapProvider } from "./services/maps";

registerMapProvider("leaflet", {
  async create({ container, center, zoom, options }) {
    // Create the vendor map and return the normalized controller.
    return {
      setBehaviors(behaviors) {},
      setCenter(position, movement) {},
      setZoom(zoom) {},
      setMarkers(markers) {},
      async setRoute(route) {},
      clearRoute() {},
      fitBounds(positions, options) {},
      async reverseGeocode(position) {},
      resize() {},
      getInstance() {},
      destroy() {},
    };
  },
});
```

Adapter positions always use `{ lat, lng }`. Marker definitions use
`{ id, position, title, popup, color, draggable }`. Provider options should be
memoized because a new options object intentionally recreates the vendor map.

Google Maps needs a browser API key and map ID. Google OAuth uses a separate
OAuth web client ID; these credentials are not interchangeable.
