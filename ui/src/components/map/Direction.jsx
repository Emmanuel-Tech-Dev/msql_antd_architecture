import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Spin, message, Alert } from 'antd';
import {
    EnvironmentOutlined, AimOutlined,
    CarOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import mapboxgl, {
    getRoute, getCurrentPosition,
    formatDistance, formatDuration,
} from '../../utils/mapbox';

export default function DirectionsMap({ beneficiary, showNavigation = true }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [loading, setLoading] = useState(true);
    const [routing, setRouting] = useState(false);
    const [routeInfo, setRouteInfo] = useState(null);

    // Callback ref — fires when DOM element is actually mounted
    const initMap = useCallback((node) => {
        if (!node || map.current || !beneficiary?.latitude || !beneficiary?.longitude) return;
        mapContainer.current = node;

        const center = [
            parseFloat(beneficiary.longitude),
            parseFloat(beneficiary.latitude),
        ];

        map.current = new mapboxgl.Map({
            container: node,
            style: 'mapbox://styles/mapbox/standard-satellite',
            center,
            zoom: 14,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.on('load', () => setLoading(false));

        new mapboxgl.Marker({ color: '#5e6ad2' })
            .setLngLat(center)
            .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                    `<div style="color:#000;font-size:12px;font-weight:600">
                        ${beneficiary.first_name} ${beneficiary.last_name}
                    </div>
                    <div style="color:#666;font-size:11px;margin-top:2px">
                        ${beneficiary.address || beneficiary.community || ''}
                    </div>`
                )
            )
            .addTo(map.current);
    }, [beneficiary]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    const getDirections = async () => {
        if (!beneficiary?.longitude || !beneficiary?.latitude) return;
        setRouting(true);
        try {
            const userPos = await getCurrentPosition();

            const destination = {
                lng: parseFloat(beneficiary.longitude),
                lat: parseFloat(beneficiary.latitude),
            };

            new mapboxgl.Marker({ color: '#10b981' })
                .setLngLat([userPos.lng, userPos.lat])
                .setPopup(
                    new mapboxgl.Popup({ offset: 25 })
                        .setHTML('<div style="color:#000;font-size:12px">Your Location</div>')
                )
                .addTo(map.current);

            const route = await getRoute(userPos, destination);
            if (!route) throw new Error('No route found');

            if (map.current.getSource('route')) {
                map.current.getSource('route').setData({
                    type: 'Feature', geometry: route.geometry,
                });
            } else {
                map.current.addSource('route', {
                    type: 'geojson',
                    data: { type: 'Feature', geometry: route.geometry },
                });
                map.current.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': '#5e6ad2',
                        'line-width': 4,
                        'line-opacity': 0.9,
                    },
                });
            }

            const coords = route.geometry.coordinates;
            const bounds = coords.reduce(
                (b, c) => b.extend(c),
                new mapboxgl.LngLatBounds(coords[0], coords[0])
            );
            map.current.fitBounds(bounds, { padding: 60 });

            const steps = route.legs?.[0]?.steps?.map(s => ({
                instruction: s.maneuver.instruction,
                distance: formatDistance(s.distance),
                type: s.maneuver.type,
            })) || [];

            setRouteInfo({
                distance: formatDistance(route.distance),
                duration: formatDuration(route.duration),
                steps,
            });

        } catch (err) {
            if (err.code === 1) {
                message.error('Location access denied — please allow location access');
            } else {
                message.error(err.message || 'Failed to get directions');
            }
        } finally {
            setRouting(false);
        }
    };

    const clearRoute = () => {
        if (!beneficiary?.longitude || !beneficiary?.latitude) return;
        if (map.current?.getLayer('route')) map.current.removeLayer('route');
        if (map.current?.getSource('route')) map.current.removeSource('route');
        setRouteInfo(null);
        map.current?.flyTo({
            center: [parseFloat(beneficiary.longitude), parseFloat(beneficiary.latitude)],
            zoom: 14,
        });
    };

    // --- CONDITIONAL RENDERING SAFELY AFTER HOOKS ---

    // 1. Loading State
    if (!beneficiary) {
        return (
            <div style={{ height: 380 }} className="flex items-center justify-center bg-[#0f1011] rounded-lg">
                <Spin tip="Loading beneficiary details..." />
            </div>
        );
    }

    const hasLocation = beneficiary.latitude && beneficiary.longitude;

    // 2. Fallback warning for missing coordinates (Using updated AntD 'title' instead of 'message')
    if (!hasLocation) {
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
            <div
                className="relative rounded-lg overflow-hidden border border-white/10"
                style={{ height: 380 }}
            >
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0f1011] z-10">
                        <Spin />
                    </div>
                )}
                <div ref={initMap} className="w-full h-full" />
            </div>

            {routeInfo ? (
                <div className=" border border-white/5 rounded-lg p-2">
                    <div className="flex items-center gap-6 mb-4">
                        <div className="flex items-center gap-2">
                            <CarOutlined className="text-[#5e6ad2]" />
                            <span className=" font-semibold text-sm">
                                {routeInfo.distance}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ClockCircleOutlined className="text-[#10b981]" />
                            <span className=" font-semibold text-sm">
                                {routeInfo.duration}
                            </span>
                        </div>
                        <Button
                            size="small"
                            onClick={clearRoute}
                            className="ml-auto border-white/10 text-[#8a8f98]"
                        >
                            Clear Route
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {routeInfo.steps.map((step, i) => (
                            <div key={i}
                                className="flex items-start gap-3 py-1.5 border-b border-white/4 last:border-0">
                                <div className="w-5 h-5 rounded-full bg-[rgba(94,106,210,0.15)] text-[#7170ff] flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-[#4b4c4c]">{step.instruction}</div>
                                    <div className="text-xs text-[#62666d] mt-0.5">{step.distance}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between border border-white/5 rounded-lg p-2 gap-5">
                    <div>
                        <div className=" text-sm font-medium">Get Directions</div>
                        <div className="text-[#62666d] text-xs mt-0.5">
                            Navigate from your current location to this beneficiary
                        </div>
                    </div>
                    <Button
                        type="primary"
                        icon={<AimOutlined />}
                        loading={routing}
                        onClick={getDirections}
                        className="bg-[#5e6ad2] border-none"
                    >
                        {routing ? 'Locating...' : 'Start Navigation'}
                    </Button>
                </div>
            )}

            {beneficiary.address && (
                <div className="flex items-start gap-2 text-xs text-[#8a8f98] px-1 pb-2">
                    <EnvironmentOutlined className="mt-0.5 text-[#5e6ad2] flex-shrink-0" />
                    <span>{beneficiary.address}</span>
                </div>
            )}
        </div>
    );
}