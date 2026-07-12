import { useEffect, useRef, useState } from 'react';
import { Button, Spin } from 'antd';
import { EnvironmentOutlined, AimOutlined } from '@ant-design/icons';
import mapboxgl, { reverseGeocode, getCurrentPosition } from '../../utils/mapbox';

// Ghana center as default
const GHANA_CENTER = { lng: -1.0232, lat: 7.9465 };
const GHANA_ZOOM = 6;

export default function LocationPicker({ value, onChange }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const marker = useRef(null);
    const [loading, setLoading] = useState(true);
    const [locating, setLocating] = useState(false);
    const [address, setAddress] = useState('');

    useEffect(() => {
        if (map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: value
                ? [value.longitude, value.latitude]
                : [GHANA_CENTER.lng, GHANA_CENTER.lat],
            zoom: value ? 14 : GHANA_ZOOM,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => setLoading(false));

        // If we have an existing value — place marker
        if (value?.latitude && value?.longitude) {
            placeMarker(value.longitude, value.latitude);
        }

        // Click to place pin
        map.current.on('click', async (e) => {
            const { lng, lat } = e.lngLat;
            placeMarker(lng, lat);
            const addr = await reverseGeocode(lng, lat);
            setAddress(addr);
            onChange?.({ latitude: lat, longitude: lng, address: addr });
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    const placeMarker = (lng, lat) => {
        if (marker.current) marker.current.remove();
        marker.current = new mapboxgl.Marker({ color: '#5e6ad2', draggable: true })
            .setLngLat([lng, lat])
            .addTo(map.current);

        // Update on drag end
        marker.current.on('dragend', async () => {
            const pos = marker.current.getLngLat();
            const addr = await reverseGeocode(pos.lng, pos.lat);
            setAddress(addr);
            onChange?.({ latitude: pos.lat, longitude: pos.lng, address: addr });
        });
    };

    const useCurrentLocation = async () => {
        setLocating(true);
        try {
            const pos = await getCurrentPosition();
            map.current.flyTo({ center: [pos.lng, pos.lat], zoom: 15 });
            placeMarker(pos.lng, pos.lat);
            const addr = await reverseGeocode(pos.lng, pos.lat);
            setAddress(addr);
            onChange?.({ latitude: pos.lat, longitude: pos.lng, address: addr });
        } catch {
            // User denied location — just center on Ghana
            map.current.flyTo({ center: [GHANA_CENTER.lng, GHANA_CENTER.lat], zoom: GHANA_ZOOM });
        } finally {
            setLocating(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden border border-white/10"
                style={{ height: 280 }}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center
                          bg-[#0f1011] z-10">
                        <Spin />
                    </div>
                )}
                <div ref={mapContainer} className="w-full h-full" />

                {/* Use my location button */}
                <Button
                    size="small"
                    icon={<AimOutlined />}
                    loading={locating}
                    onClick={useCurrentLocation}
                    className="absolute top-2 left-2 z-10 bg-[#0f1011]
                     border-white/10 text-white text-xs"
                >
                    My Location
                </Button>
            </div>

            {/* Address preview */}
            {address && (
                <div className="flex items-start gap-2 text-xs text-[#8a8f98] px-1">
                    <EnvironmentOutlined className="mt-0.5 flex-shrink-0 text-[#5e6ad2]" />
                    <span>{address}</span>
                </div>
            )}
            {!address && (
                <p className="text-xs text-[#62666d] px-1">
                    Click on the map or drag the pin to set location
                </p>
            )}
        </div>
    );
}