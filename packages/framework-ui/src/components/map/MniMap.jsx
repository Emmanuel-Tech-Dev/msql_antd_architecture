import React from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";

// FIX 1: Use a reliable CDN URL that won't 404
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// FIX 2: Match by Country Name instead of ISO codes. 
// Different map files use different ID formats (numbers vs letters), 
// but they ALL have a reliable "properties.name" field.
const mockNgoData = [
    { name: "United States of America", value: 80 },
    { name: "Ghana", value: 95 },
    { name: "Nigeria", value: 60 },
    { name: "Indonesia", value: 85 },
    { name: "Brazil", value: 70 },
];

const colorScale = scaleLinear()
    .domain([0, 100])
    .range(["#c7d2fe", "#4f46e5"]); // Indigo-200 to Indigo-600

export function MiniImpactMap() {
    return (
        <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">
                Global Impact Overview
            </h3>
            <p className="text-xs text-slate-400 mb-4">
                Program presence by country
            </p>

            <div className="w-full h-[350px] flex items-center justify-center bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100">
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 120,
                        center: [0, 20],
                    }}
                    width={800}
                    height={400}
                    style={{
                        width: "100%",
                        height: "auto",
                        maxHeight: "100%"
                    }}
                >
                    <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                // FIX 3: Match by geo.properties.name
                                const countryData = mockNgoData.find(
                                    (d) => d.name === geo.properties.name
                                );

                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill={
                                            countryData
                                                ? colorScale(countryData.value)
                                                : "#e2e8f0" // Slate-200 for inactive countries
                                        }
                                        stroke="#ffffff"
                                        strokeWidth={0.5}
                                        style={{
                                            default: {
                                                outline: "none",
                                                transition: "fill 0.2s ease",
                                            },
                                            hover: {
                                                fill: "#1d4ed8", // Blue-700 on hover
                                                outline: "none",
                                                cursor: "pointer",
                                            },
                                            pressed: {
                                                outline: "none",
                                            },
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>
                </ComposableMap>
            </div>
        </div>
    );
}