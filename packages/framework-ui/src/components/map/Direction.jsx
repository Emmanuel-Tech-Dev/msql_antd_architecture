import { useMemo, useRef, useState } from "react";
import { Alert, Button, message, Spin } from "antd";
import {
  AimOutlined,
  CarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { getBrowserPosition } from "../../services/maps";
import { formatDistance, formatDuration } from "../../utils/mapbox";
import MapView from "./MapView";
import { frameworkConfig } from "../../core/config/frameworkConfig";

const EMPTY_OPTIONS = Object.freeze({});

// Any record with a position: { lat, lng }, { latitude, longitude } or
// { lng, lat } columns. Projects with other column names pass getPosition.
const positionOf = (record) => {
  const lat = Number(record?.lat ?? record?.latitude);
  const lng = Number(record?.lng ?? record?.lon ?? record?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const titleOf = (record) =>
  record?.name ?? record?.title ?? record?.label
  ?? ([record?.first_name, record?.last_name].filter(Boolean).join(" ") || "Destination");

const descriptionOf = (record) => record?.address ?? record?.location ?? record?.description ?? "";

const resolve = (value, record, fallback) => (typeof value === "function" ? value(record) : value ?? fallback(record));

// Directions from the viewer (or a fixed origin) to one record on the map.
export default function DirectionsMap({
  destination,
  getPosition = positionOf,
  title,
  description,
  origin,
  travelMode = "driving",
  loading = false,
  emptyMessage = "This record has no map location saved yet.",
  onRoute,
  provider = frameworkConfig.mapProvider || "mapbox",
  providerOptions = EMPTY_OPTIONS,
  height = 380,
  className = "",
}) {
  const mapActions = useRef(null);
  const [routing, setRouting] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [startPosition, setStartPosition] = useState(null);

  const target = useMemo(() => (destination ? getPosition(destination) : null), [destination, getPosition]);
  const label = resolve(title, destination, titleOf);
  const detail = resolve(description, destination, descriptionOf);

  const markers = useMemo(() => {
    if (!target) return [];
    const result = [{ id: "destination", position: target, title: label, popup: [label, detail].filter(Boolean).join(" — ") }];
    if (startPosition) {
      result.push({ id: "start", position: startPosition, color: "#10b981", title: origin ? "Start" : "Your location" });
    }
    return result;
  }, [detail, label, origin, startPosition, target]);

  const behaviors = useMemo(
    () => ({
      onRoute: (result) => {
        setRouteInfo({
          distance: formatDistance(result.distanceMeters),
          duration: formatDuration(result.durationSeconds),
          steps: result.steps.map((step) => ({
            instruction: step.instruction,
            distance: formatDistance(step.distanceMeters),
          })),
        });
        setRouting(false);
        onRoute?.(result);
      },
      onError: (error) => {
        message.error(error.message || "The map or the route could not be loaded");
        setRouting(false);
      },
    }),
    [onRoute],
  );

  const getDirections = async () => {
    if (!target) return;
    setRouting(true);
    try {
      const start = origin ? getPosition(origin) ?? origin : await getBrowserPosition();
      setStartPosition(start);
      setRoute({ origin: start, destination: target, travelMode });
    } catch (error) {
      setRouting(false);
      message.error(error.code === 1
        ? "Location access was refused. Allow location access in the browser to get directions."
        : error.message || "Your location could not be found");
    }
  };

  const clearRoute = () => {
    setRoute(null);
    setRouteInfo(null);
    setStartPosition(null);
    if (target) mapActions.current?.setCenter(target, { zoom: 14 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-[var(--ads-surface-sunken)]" style={{ height }}>
        <Spin />
      </div>
    );
  }

  if (!target) {
    return <Alert type="warning" showIcon title="No location" description={emptyMessage} />;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <MapView
        ref={mapActions}
        provider={provider}
        providerOptions={providerOptions}
        center={target}
        zoom={14}
        markers={markers}
        route={route}
        behaviors={behaviors}
        className="rounded-lg border border-[var(--ads-border)]"
        style={{ height }}
      />

      {routeInfo ? (
        <div className="rounded-lg border border-[var(--ads-border-subtle)] p-3">
          <div className="mb-3 flex items-center gap-6">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ads-text-heading)]">
              <CarOutlined className="text-[var(--ads-accent)]" />{routeInfo.distance}
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ads-text-heading)]">
              <ClockCircleOutlined className="text-[var(--ads-success)]" />{routeInfo.duration}
            </span>
            <Button size="small" onClick={clearRoute} className="ml-auto">Clear route</Button>
          </div>
          <ol className="m-0 max-h-48 list-none space-y-2 overflow-y-auto p-0 pr-1">
            {routeInfo.steps.map((step, index) => (
              <li key={`${step.instruction}-${index}`} className="flex items-start gap-3 border-b border-[var(--ads-border-subtle)] py-1.5 last:border-0">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ads-accent-soft)] text-[10px] font-bold text-[var(--ads-accent)]">
                  {index + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-[var(--ads-text)]">{step.instruction}</span>
                  <span className="mt-0.5 block text-xs text-[var(--ads-text-muted)]">{step.distance}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-5 rounded-lg border border-[var(--ads-border-subtle)] p-3">
          <div>
            <div className="text-sm font-medium text-[var(--ads-text-heading)]">Get directions</div>
            <div className="mt-0.5 text-xs text-[var(--ads-text-muted)]">
              {origin ? "From the starting point" : "From your current location"} to {label}
            </div>
          </div>
          <Button type="primary" icon={<AimOutlined />} loading={routing} onClick={getDirections}>
            {routing ? "Finding the route…" : "Start navigation"}
          </Button>
        </div>
      )}

      {detail && (
        <div className="flex items-start gap-2 px-1 text-xs text-[var(--ads-text-muted)]">
          <EnvironmentOutlined className="mt-0.5 flex-shrink-0 text-[var(--ads-accent)]" />
          <span>{detail}</span>
        </div>
      )}
    </div>
  );
}
