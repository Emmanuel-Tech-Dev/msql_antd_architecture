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

export default function DirectionsMap({
  beneficiary,
  provider = frameworkConfig.mapProvider || "mapbox",
  providerOptions = EMPTY_OPTIONS,
}) {
  const mapActions = useRef(null);
  const [routing, setRouting] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [userPosition, setUserPosition] = useState(null);

  const destination = useMemo(() => {
    const lat = Number(beneficiary?.latitude);
    const lng = Number(beneficiary?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [beneficiary?.latitude, beneficiary?.longitude]);

  const markers = useMemo(() => {
    if (!destination) return [];
    const beneficiaryName = [beneficiary?.first_name, beneficiary?.last_name]
      .filter(Boolean)
      .join(" ");
    const result = [
      {
        id: "beneficiary",
        position: destination,
        color: "#5e6ad2",
        title: beneficiaryName || "Beneficiary",
        popup:
          [beneficiaryName, beneficiary?.address || beneficiary?.community]
            .filter(Boolean)
            .join(" — ") || "Beneficiary",
      },
    ];

    if (userPosition) {
      result.push({
        id: "current-user",
        position: userPosition,
        color: "#10b981",
        title: "Your location",
        popup: "Your location",
      });
    }
    return result;
  }, [beneficiary, destination, userPosition]);

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
      },
      onError: (error) => {
        message.error(error.message || "Failed to load the map or route");
        setRouting(false);
      },
    }),
    [],
  );

  const getDirections = async () => {
    if (!destination) return;
    setRouting(true);
    try {
      const origin = await getBrowserPosition();
      setUserPosition(origin);
      setRoute({
        origin,
        destination,
        travelMode: "driving",
        color: "#5e6ad2",
        fitBounds: true,
      });
    } catch (error) {
      setRouting(false);
      if (error.code === 1) {
        message.error("Location access denied — please allow location access");
      } else {
        message.error(error.message || "Unable to determine your location");
      }
    }
  };

  const clearRoute = () => {
    setRoute(null);
    setRouteInfo(null);
    setUserPosition(null);
    if (destination) {
      mapActions.current?.setCenter(destination, { zoom: 14 });
    }
  };

  if (!beneficiary) {
    return (
      <div className="flex h-[380px] items-center justify-center rounded-lg bg-[#0f1011]">
        <Spin tip="Loading beneficiary details..." />
      </div>
    );
  }

  if (!destination) {
    return (
      <Alert
        type="warning"
        title="No location set"
        description="This beneficiary does not have a map location saved. Edit their profile to add one."
        showIcon
      />
    );
  }

  return (
    <div className="space-y-4">
      <MapView
        ref={mapActions}
        provider={provider}
        providerOptions={providerOptions}
        center={destination}
        zoom={14}
        markers={markers}
        route={route}
        behaviors={behaviors}
        className="rounded-lg border border-white/10"
        style={{ height: 380 }}
      />

      {routeInfo ? (
        <div className="rounded-lg border border-white/5 p-2">
          <div className="mb-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CarOutlined className="text-[#5e6ad2]" />
              <span className="text-sm font-semibold">{routeInfo.distance}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockCircleOutlined className="text-[#10b981]" />
              <span className="text-sm font-semibold">{routeInfo.duration}</span>
            </div>
            <Button
              size="small"
              onClick={clearRoute}
              className="ml-auto border-white/10 text-[#8a8f98]"
            >
              Clear Route
            </Button>
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {routeInfo.steps.map((step, index) => (
              <div
                key={`${step.instruction}-${index}`}
                className="flex items-start gap-3 border-b border-white/4 py-1.5 last:border-0"
              >
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(94,106,210,0.15)] text-[10px] font-bold text-[#7170ff]">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[#4b4c4c]">
                    {step.instruction}
                  </div>
                  <div className="mt-0.5 text-xs text-[#62666d]">
                    {step.distance}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-5 rounded-lg border border-white/5 p-2">
          <div>
            <div className="text-sm font-medium">Get Directions</div>
            <div className="mt-0.5 text-xs text-[#62666d]">
              Navigate from your current location to this beneficiary
            </div>
          </div>
          <Button
            type="primary"
            icon={<AimOutlined />}
            loading={routing}
            onClick={getDirections}
            className="border-none bg-[#5e6ad2]"
          >
            {routing ? "Locating..." : "Start Navigation"}
          </Button>
        </div>
      )}

      {beneficiary.address && (
        <div className="flex items-start gap-2 px-1 pb-2 text-xs text-[#8a8f98]">
          <EnvironmentOutlined className="mt-0.5 flex-shrink-0 text-[#5e6ad2]" />
          <span>{beneficiary.address}</span>
        </div>
      )}
    </div>
  );
}
