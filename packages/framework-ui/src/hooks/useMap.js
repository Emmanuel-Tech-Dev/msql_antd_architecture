import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getBrowserPosition,
  resolveMapProvider,
} from "../services/maps";

const DEFAULT_CENTER = Object.freeze({ lat: 7.9465, lng: -1.0232 });
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

export default function useMap({
  provider = "mapbox",
  center = DEFAULT_CENTER,
  zoom = 6,
  markers = EMPTY_ARRAY,
  route = null,
  behaviors = EMPTY_OBJECT,
  providerOptions = EMPTY_OBJECT,
} = {}) {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ status: "idle", error: null });
  const adapter = useMemo(() => resolveMapProvider(provider), [provider]);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    let cancelled = false;
    let createdController = null;

    adapter
      .create({
        container: containerRef.current,
        center: DEFAULT_CENTER,
        zoom: 6,
        options: providerOptions,
      })
      .then((controller) => {
        if (cancelled) {
          controller.destroy();
          return;
        }
        createdController = controller;
        controllerRef.current = controller;
        setState({ status: "ready", error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: "error", error });
      });

    return () => {
      cancelled = true;
      createdController?.destroy();
      if (controllerRef.current === createdController) controllerRef.current = null;
    };
  }, [adapter, providerOptions, reloadKey]);

  useEffect(() => {
    controllerRef.current?.setBehaviors(behaviors);
  }, [behaviors, state.status]);

  useEffect(() => {
    if (state.status !== "ready") return;
    controllerRef.current?.setCenter(center, { animate: false });
  }, [center, state.status]);

  useEffect(() => {
    if (state.status !== "ready") return;
    controllerRef.current?.setZoom(zoom);
  }, [state.status, zoom]);

  useEffect(() => {
    if (state.status !== "ready") return;
    controllerRef.current?.setMarkers(markers);
  }, [markers, state.status]);

  useEffect(() => {
    if (state.status !== "ready") return;
    Promise.resolve(controllerRef.current?.setRoute(route)).catch((error) => {
      setState((current) => ({ ...current, error }));
    });
  }, [route, state.status]);

  useEffect(() => {
    if (state.error) behaviors.onError?.(state.error);
  }, [behaviors, state.error]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => controllerRef.current?.resize());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const call = useCallback(
    (method, ...args) => controllerRef.current?.[method]?.(...args),
    [],
  );

  const actions = useMemo(
    () => ({
      clearRoute: () => call("clearRoute"),
      fitBounds: (positions, options) => call("fitBounds", positions, options),
      getCurrentPosition: getBrowserPosition,
      getInstance: () => call("getInstance"),
      reload: () => {
        setState({ status: "loading", error: null });
        setReloadKey((key) => key + 1);
      },
      resize: () => call("resize"),
      reverseGeocode: (position) => call("reverseGeocode", position),
      setCenter: (position, options) => call("setCenter", position, options),
      setMarkers: (nextMarkers) => call("setMarkers", nextMarkers),
      setRoute: (request) => call("setRoute", request),
      setZoom: (nextZoom) => call("setZoom", nextZoom),
    }),
    [call],
  );

  return {
    actions,
    containerRef,
    error: state.error,
    isReady: state.status === "ready",
    provider: adapter.name,
    status: state.status,
  };
}
