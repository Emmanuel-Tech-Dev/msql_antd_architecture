import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AimOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { Button, message } from "antd";
import { getBrowserPosition } from "../../services/maps";
import MapView from "./MapView";
import { frameworkConfig } from "../../core/config/frameworkConfig";

const GHANA_CENTER = Object.freeze({ lng: -1.0232, lat: 7.9465 });
const EMPTY_OPTIONS = Object.freeze({});

const valueToPosition = (value) => {
  const lat = Number(value?.latitude);
  const lng = Number(value?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

export default function LocationPicker({
  value,
  onChange,
  provider = frameworkConfig.mapProvider || "mapbox",
  providerOptions = EMPTY_OPTIONS,
}) {
  const mapActions = useRef(null);
  const lookupId = useRef(0);
  const [position, setPosition] = useState(() => valueToPosition(value));
  const [address, setAddress] = useState(value?.address || "");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const nextPosition = valueToPosition(value);
    setPosition(nextPosition);
    setAddress(value?.address || "");
  }, [value]);

  const selectPosition = useCallback(
    async (nextPosition) => {
      const requestId = ++lookupId.current;
      setPosition(nextPosition);
      try {
        const nextAddress = await mapActions.current?.reverseGeocode(nextPosition);
        if (requestId !== lookupId.current) return;
        setAddress(nextAddress || "");
        onChange?.({
          address: nextAddress || "",
          latitude: nextPosition.lat,
          longitude: nextPosition.lng,
        });
      } catch (error) {
        if (requestId !== lookupId.current) return;
        message.error(error.message || "Unable to resolve this address");
      }
    },
    [onChange],
  );

  const behaviors = useMemo(
    () => ({
      onMapClick: ({ position: nextPosition }) => selectPosition(nextPosition),
      onMarkerDragEnd: ({ position: nextPosition }) =>
        selectPosition(nextPosition),
      onError: (error) => message.error(error.message || "Unable to load the map"),
    }),
    [selectPosition],
  );

  const markers = useMemo(
    () =>
      position
        ? [
            {
              id: "selected-location",
              position,
              color: "#5e6ad2",
              draggable: true,
              title: "Selected location",
            },
          ]
        : [],
    [position],
  );

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const nextPosition = await getBrowserPosition();
      mapActions.current?.setCenter(nextPosition, { zoom: 15 });
      await selectPosition(nextPosition);
    } catch (error) {
      if (error.code === 1) {
        message.error("Location access denied — please allow location access");
      } else {
        message.error(error.message || "Unable to determine your location");
      }
      mapActions.current?.setCenter(GHANA_CENTER, { zoom: 6 });
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapView
          ref={mapActions}
          provider={provider}
          providerOptions={providerOptions}
          center={position || GHANA_CENTER}
          zoom={position ? 14 : 6}
          markers={markers}
          behaviors={behaviors}
          className="rounded-lg border border-white/10"
          style={{ height: 280 }}
        />
        <Button
          size="small"
          icon={<AimOutlined />}
          loading={locating}
          onClick={useCurrentLocation}
          className="absolute top-2 left-2 z-20 border-white/10 bg-[#0f1011] text-xs text-white"
        >
          My Location
        </Button>
      </div>

      {address ? (
        <div className="flex items-start gap-2 px-1 text-xs text-[#8a8f98]">
          <EnvironmentOutlined className="mt-0.5 flex-shrink-0 text-[#5e6ad2]" />
          <span>{address}</span>
        </div>
      ) : (
        <p className="px-1 text-xs text-[#62666d]">
          Click on the map or drag the pin to set location
        </p>
      )}
    </div>
  );
}
