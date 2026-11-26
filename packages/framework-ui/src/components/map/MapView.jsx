import { forwardRef, useImperativeHandle } from "react";
import { Spin } from "antd";
import useMap from "../../hooks/useMap";
import { frameworkConfig } from "../../core/config/frameworkConfig";

const MapView = forwardRef(function MapView(
  {
    provider = frameworkConfig.mapProvider || "mapbox",
    center,
    zoom,
    markers,
    route,
    behaviors,
    providerOptions,
    className = "",
    style,
    loadingFallback,
    errorFallback,
  },
  ref,
) {
  const {
    actions,
    containerRef,
    error,
    provider: activeProvider,
    status,
  } = useMap({
    provider,
    center,
    zoom,
    markers,
    route,
    behaviors,
    providerOptions,
  });

  useImperativeHandle(ref, () => actions, [actions]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight: 280, ...style }}
      data-map-provider={activeProvider}
    >
      <div ref={containerRef} className="h-full w-full" />
      {status === "loading" && (
        loadingFallback || (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f1011]">
            <Spin />
          </div>
        )
      )}
      {status === "error" && (
        errorFallback || (
          <div
            role="alert"
            className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f1011] p-6 text-center text-sm text-red-300"
          >
            {error?.message || "The map could not be loaded"}
          </div>
        )
      )}
    </div>
  );
});

export default MapView;
