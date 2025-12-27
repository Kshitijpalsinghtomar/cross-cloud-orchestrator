import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function RegionMap() {
    const { data: health } = useQuery({ queryKey: ['health'], queryFn: api.getHealth });

    // Precise Lat/Lon coordinates for AWS/GCP regions
    const markers: Record<string, [number, number]> = {
        'us-east-1': [-77.0469, 38.8048], // N. Virginia
        'us-west-2': [-119.4179, 44.0000], // Oregon (approx)
        'eu-west-1': [-6.2597, 53.3478], // Dublin
        'ap-northeast-1': [139.6917, 35.6895], // Tokyo
        'us-central1': [-93.5, 41.5], // Iowa
        'eastus': [-79.4, 37.0], // Virginia/East US
        'ap-southeast-2': [151.2093, -33.8688], // Sydney
        'global': [0, 20], // Fallback
    };

    return (
        <div className="bg-[#0f172a] rounded-2xl border border-[var(--border-main)] overflow-hidden relative h-full w-full shadow-inner group">
            {/* Title Overlay */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <h3 className="text-xs font-bold text-slate-300 tracking-widest uppercase">Live Network</h3>
                </div>
            </div>

            <div className="w-full h-full flex items-center justify-center pt-8 pl-4">
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 100,
                        center: [0, 20]
                    }}
                    style={{ width: "100%", height: "100%" }}
                >
                    <Geographies geography={geoUrl}>
                        {({ geographies }: { geographies: any[] }) =>
                            geographies.map((geo) => (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill="#1e293b"
                                    stroke="#334155"
                                    strokeWidth={0.5}
                                    style={{
                                        default: { outline: "none" },
                                        hover: { fill: "#334155", outline: "none" },
                                        pressed: { outline: "none" },
                                    }}
                                />
                            ))
                        }
                    </Geographies>

                    {/* Render Markers for Live Providers */}
                    {health?.providers?.map((p: any) => {
                        const coords = markers[p.region] || markers['global'];
                        const isOnline = p.status === 'Online';

                        return (
                            <Marker key={p.provider} coordinates={coords}>
                                <g
                                    fill="none"
                                    stroke={isOnline ? "#38bdf8" : "#ef4444"}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    transform="translate(-12, -24)"
                                    className="cursor-pointer hover:scale-110 transition-transform duration-200"
                                >
                                    <circle cx="12" cy="10" r="3" fill={isOnline ? "#38bdf8" : "#ef4444"} />
                                    <circle cx="12" cy="10" r="8" opacity="0.3" fill={isOnline ? "#38bdf8" : "#ef4444"}>
                                        {isOnline && <animate attributeName="r" from="8" to="14" dur="1.5s" repeatCount="indefinite" />}
                                        {isOnline && <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />}
                                    </circle>
                                    <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
                                </g>
                                <text
                                    textAnchor="middle"
                                    y={15}
                                    style={{ fontFamily: "system-ui", fill: "#94a3b8", fontSize: "8px", fontWeight: "bold" }}
                                >
                                    {p.provider}
                                </text>
                            </Marker>
                        );
                    })}
                </ComposableMap>
            </div>
        </div>
    );
}
