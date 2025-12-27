import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ComposableMap, Geographies, Geography, Marker, Line, Sphere, Graticule } from "react-simple-maps";
import { useState, useMemo, useRef, useCallback } from 'react';
import { Activity, Zap, Maximize, RotateCw, Power, ShieldAlert, Globe, Cpu, List, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Mock Data Generators for "Realism"
const generateThreads = (count: number) => Array.from({ length: count }).map(() => ({
    pid: Math.floor(Math.random() * 9000) + 1000,
    name: ['request_handler', 'db_pool_writer', 'auth_verifier', 'bg_worker', 'metrics_collector'][Math.floor(Math.random() * 5)],
    cpu: (Math.random() * 15).toFixed(1),
    mem: (Math.random() * 200 + 50).toFixed(0),
    status: Math.random() > 0.1 ? 'Running' : 'Sleep',
    uptime: `${Math.floor(Math.random() * 48)}h ${Math.floor(Math.random() * 60)} m`
}));

export default function GlobalNetwork() {
    const { theme } = useTheme();
    const { data: health } = useQuery({ queryKey: ['health'], queryFn: api.getHealth });
    const { data: executions } = useQuery({ queryKey: ['executions'], queryFn: () => api.listExecutions({ limit: 10, offset: 0 }).then(res => res.items) });

    const [selectedRegion, setSelectedRegion] = useState<any>(null);
    const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
    const [scale, setScale] = useState(280);
    const [showTraffic, setShowTraffic] = useState(true);
    const [activeTab, setActiveTab] = useState<'metrics' | 'threads' | 'workflows'>('metrics');

    // Theme-based Styles for Map Canvas
    const mapTheme = useMemo(() => ({
        ocean: theme === 'dark' ? "#0f172a" : "#f1f5f9", // Slate-900 / Slate-100
        land: theme === 'dark' ? "#1e293b" : "#cbd5e1", // Slate-800 / Slate-300
        stroke: theme === 'dark' ? "#334155" : "#94a3b8", // Slate-700 / Slate-400
        graticule: theme === 'dark' ? "#1e293b" : "#e2e8f0", // Slate-800 / Slate-200
        traffic: theme === 'dark' ? "#38bdf8" : "#2563eb", // Sky-400 / Blue-600
        text: theme === 'dark' ? "#f1f5f9" : "#334155", // Slate-100 / Slate-700
        textMuted: theme === 'dark' ? "#94a3b8" : "#64748b", // Slate-400 / Slate-500
    }), [theme]);

    // Drag & Interaction State
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const dragStartPos = useRef({ x: 0, y: 0 });

    const handleRotate = useCallback((dx: number, dy: number) => {
        setRotation(([r0, r1, r2]) => [r0 + dx, Math.max(-90, Math.min(90, r1 - dy)), r2]);
    }, []);

    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        dragStartPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        handleRotate(dx * 0.5, dy * 0.5);
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
        isDragging.current = false;
    };

    const onWheel = (e: React.WheelEvent) => {
        const delta = -e.deltaY;
        setScale(s => Math.min(Math.max(s + delta * 0.5, 100), 800));
    };

    // Smart Click Handler: Only fires if drag distance was small
    const handleNodeClick = (e: React.MouseEvent, p: any) => {
        e.stopPropagation();
        const dist = Math.hypot(e.clientX - dragStartPos.current.x, e.clientY - dragStartPos.current.y);
        if (dist < 5) {
            setSelectedRegion(p);
        }
    };

    const markers: Record<string, [number, number]> = {
        'us-east-1': [-77.0469, 38.8048],
        'us-west-2': [-119.4179, 44.0000],
        'eu-west-1': [-6.2597, 53.3478],
        'ap-northeast-1': [139.6917, 35.6895],
        'us-central1': [-93.5, 41.5],
        'eastus': [-79.4, 37.0],
        'ap-southeast-2': [151.2093, -33.8688],
        'global': [0, 20],
    };

    const links = [
        { from: 'us-west-2', to: 'us-east-1' },
        { from: 'us-east-1', to: 'eu-west-1' },
        { from: 'eu-west-1', to: 'ap-northeast-1' },
        { from: 'ap-northeast-1', to: 'ap-southeast-2' },
        { from: 'ap-southeast-2', to: 'us-west-2' },
        { from: 'us-central1', to: 'us-east-1' },
        { from: 'eastus', to: 'eu-west-1' },
    ];

    const regionThreads = useMemo(() => selectedRegion ? generateThreads(8) : [], [selectedRegion]);
    const activeExecutions = useMemo(() => executions || [], [executions]);

    return (
        <div className="h-[calc(100vh-6rem)] flex gap-6 text-[var(--text-main)]">
            {/* Map Container */}
            <div
                className="flex-1 rounded-2xl border border-[var(--border-main)] overflow-hidden relative shadow-2xl flex flex-col group cursor-move select-none transition-colors duration-300 bg-[var(--bg-panel)]"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onWheel={onWheel}
            >
                <div className="absolute top-6 left-6 z-10 pointer-events-none">
                    <h1 className="text-2xl font-bold flex items-center gap-3 transition-colors" style={{ color: mapTheme.text }}>
                        <Globe className="w-6 h-6 text-[var(--primary-500)]" />
                        Global Network
                    </h1>
                    <p className="text-sm ml-9 opacity-80" style={{ color: mapTheme.textMuted }}>Interactive 3D Control Plane</p>
                </div>

                <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2">
                    <button
                        onClick={() => setShowTraffic(!showTraffic)}
                        className={`p-3 rounded-xl border backdrop-blur-md transition-all duration-300 ${showTraffic ? 'bg-[var(--primary-500)]/20 border-[var(--primary-500)]/50 text-[var(--primary-500)] shadow-[0_0_15px_rgba(56,189,248,0.3)]' : 'bg-[var(--bg-panel)]/80 border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--bg-app)]'}`}
                        title="Toggle Traffic"
                    >
                        <Zap className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { setRotation([0, 0, 0]); setScale(280); }}
                        className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-panel)]/80 backdrop-blur-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors"
                        title="Reset View"
                    >
                        <RotateCw className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center relative bg-[var(--bg-panel)] transition-colors duration-300">
                    <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: theme === 'dark' ? 'radial-gradient(white 1px, transparent 1px)' : 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                    <ComposableMap projection="geoOrthographic" projectionConfig={{ scale: scale, rotate: rotation }} style={{ width: "100%", height: "100%" }}>
                        <Sphere stroke={mapTheme.stroke} strokeWidth={1} fill={mapTheme.ocean} />
                        <Graticule stroke={mapTheme.graticule} strokeWidth={0.5} step={[15, 15]} />
                        <Geographies geography={geoUrl}>
                            {({ geographies }: { geographies: any[] }) => geographies.map((geo) => (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill={mapTheme.land}
                                    stroke={mapTheme.stroke}
                                    strokeWidth={0.5}
                                    style={{
                                        default: { outline: "none", transition: "all 0.3s" },
                                        hover: { fill: theme === 'dark' ? "#334155" : "#94a3b8", outline: "none" },
                                        pressed: { outline: "none" }
                                    }}
                                />
                            ))}
                        </Geographies>

                        {showTraffic && links.map((link, i) => {
                            const start = markers[link.from];
                            const end = markers[link.to];
                            if (!start || !end) return null;
                            return <Line key={i} from={start} to={end} stroke={mapTheme.traffic} strokeWidth={Math.max(1, scale / 150)} strokeOpacity={0.5} strokeDasharray="4 6" strokeLinecap="round" />;
                        })}

                        {health?.providers?.map((p: any) => {
                            const coords = markers[p.region] || markers['global'];
                            const isOnline = p.status === 'Online';
                            const isSelected = selectedRegion?.provider === p.provider;
                            const statusColor = isOnline ? (theme === 'dark' ? '#38bdf8' : '#2563eb') : '#ef4444';

                            return (
                                <Marker key={p.provider} coordinates={coords} onClick={(e: any) => handleNodeClick(e, p)} className="cursor-pointer" style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}>
                                    <g transform="translate(-12, -24)">
                                        <circle cx="12" cy="10" r={16} fill={statusColor} opacity="0.1" filter="blur(4px)" />
                                        <circle cx="12" cy="10" r={isSelected ? 6 : 4} fill={statusColor} stroke={theme === 'dark' ? "#0f172a" : "#ffffff"} strokeWidth="2" />
                                        <circle cx="12" cy="10" r={isSelected ? 20 : 8} opacity={isSelected ? 0.3 : 0.5} fill={statusColor}>
                                            {isOnline && <animate attributeName="r" from="8" to={isSelected ? "25" : "16"} dur="2s" repeatCount="indefinite" />}
                                            {isOnline && <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />}
                                        </circle>
                                    </g>
                                </Marker>
                            );
                        })}
                    </ComposableMap>
                </div>
            </div>

            {/* Enhanced Sidebar using CSS Variables */}
            <div className={`w-[400px] flex flex-col gap-4 transition-all duration-300 ${selectedRegion ? 'translate-x-0' : 'translate-x-0'}`}>
                {selectedRegion ? (
                    <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-main)] h-full animate-in slide-in-from-right duration-300 flex flex-col shadow-2xl overflow-hidden text-[var(--text-main)]">
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-[var(--border-main)] bg-[var(--bg-app)]">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg ${selectedRegion.status === 'Online' ? 'bg-[var(--primary-50)] text-[var(--primary-600)] border border-[var(--primary-100)]' : 'bg-[var(--error-bg)] text-[var(--error-text)]'}`}>
                                    {selectedRegion.provider.substring(0, 2)}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold">{selectedRegion.provider}</h2>
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                                        <Globe className="w-3 h-3" /> {selectedRegion.region}
                                        <span className="w-1 h-1 bg-[var(--text-muted)] rounded-full"></span>
                                        <span className={selectedRegion.status === 'Online' ? 'text-[var(--success-text)]' : 'text-[var(--error-text)]'}>{selectedRegion.status}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedRegion(null)} className="p-2 hover:bg-[var(--bg-app)] rounded-lg text-[var(--text-muted)] transition-colors">
                                    <Maximize className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-[var(--border-main)] bg-[var(--bg-panel)]">
                            <button onClick={() => setActiveTab('metrics')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'metrics' ? 'border-[var(--primary-500)] text-[var(--primary-600)] bg-[var(--primary-50)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                                <Activity className="w-3 h-3" /> Overview
                            </button>
                            <button onClick={() => setActiveTab('threads')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'threads' ? 'border-[var(--primary-500)] text-[var(--primary-600)] bg-[var(--primary-50)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                                <Terminal className="w-3 h-3" /> Threads
                            </button>
                            <button onClick={() => setActiveTab('workflows')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'workflows' ? 'border-[var(--primary-500)] text-[var(--primary-600)] bg-[var(--primary-50)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                                <List className="w-3 h-3" /> Workflows
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-[var(--bg-app)]">

                            {/* METRICS TAB */}
                            {activeTab === 'metrics' && (
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-main)] shadow-sm">
                                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Latency</span>
                                            <div className="mt-1 text-xl font-mono text-[var(--text-main)]">{selectedRegion.latencyMs} <span className="text-sm text-[var(--text-muted)]">ms</span></div>
                                        </div>
                                        <div className="p-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-main)] shadow-sm">
                                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Load</span>
                                            <div className="mt-1 text-xl font-mono text-[var(--text-main)]">{(Math.random() * 20 + 30).toFixed(1)} <span className="text-sm text-[var(--text-muted)]">%</span></div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-main)] shadow-sm">
                                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider flex items-center gap-2 mb-3">
                                            <Cpu className="w-3 h-3" /> CPU Usage History
                                        </span>
                                        <div className="h-24 flex items-end gap-1">
                                            {Array.from({ length: 20 }).map((_, i) => (
                                                <div key={i} className="flex-1 bg-[var(--primary-500)]/20 rounded-t-sm hover:bg-[var(--primary-500)]/40 transition-colors" style={{ height: `${Math.random() * 80 + 10}%` }}></div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <button className="flex items-center justify-center gap-2 px-3 py-3 bg-[var(--error-bg)] hover:brightness-95 border border-[var(--error-bg)] rounded-lg text-xs font-bold text-[var(--error-text)] transition-colors">
                                            <Power className="w-3 h-3" /> Restart
                                        </button>
                                        <button className="flex items-center justify-center gap-2 px-3 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-xs font-bold text-amber-500 transition-colors">
                                            <ShieldAlert className="w-3 h-3" /> Drain
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* THREADS TAB */}
                            {activeTab === 'threads' && (
                                <table className="w-full text-left text-xs text-[var(--text-muted)]">
                                    <thead className="bg-[var(--bg-panel)] text-[var(--text-muted)] sticky top-0 z-10 font-bold uppercase tracking-wider border-b border-[var(--border-main)]">
                                        <tr>
                                            <th className="p-3 font-medium">PID</th>
                                            <th className="p-3 font-medium">Process</th>
                                            <th className="p-3 font-medium text-right">CPU</th>
                                            <th className="p-3 font-medium text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-subtle)]">
                                        {regionThreads.map((t: any) => (
                                            <tr key={t.pid} className="hover:bg-[var(--bg-panel)] transition-colors group cursor-default">
                                                <td className="p-3 font-mono text-[var(--text-muted)]">{t.pid}</td>
                                                <td className="p-3 font-medium text-[var(--text-main)]">{t.name}</td>
                                                <td className="p-3 text-right font-mono">{t.cpu}%</td>
                                                <td className="p-3 text-right">
                                                    <span className={`inline-block w-2 h-2 rounded-full ${t.status === 'Running' ? 'bg-[var(--success-text)]' : 'bg-[var(--text-muted)]'}`}></span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* WORKFLOWS TAB */}
                            {activeTab === 'workflows' && (
                                <div className="p-0">
                                    {activeExecutions.length > 0 ? activeExecutions.map((exec: any) => (
                                        <Link key={exec.id} to={`/execution/${exec.id}`} className="block border-b border-[var(--border-subtle)] hover:bg-[var(--bg-panel)] transition-colors">
                                            <div className="p-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${exec.status === 'COMPLETED' ? 'bg-[var(--success-bg)] text-[var(--success-text)]' : exec.status === 'FAILED' ? 'bg-[var(--error-bg)] text-[var(--error-text)]' : 'bg-[var(--primary-50)] text-[var(--primary-600)]'}`}>
                                                        {exec.status}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-muted)]">{new Date(exec.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                                <div className="font-mono text-xs text-[var(--text-main)] truncate mb-1">{exec.id}</div>
                                                <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                                    <List className="w-3 h-3" /> {exec.spec.id}
                                                </div>
                                            </div>
                                        </Link>
                                    )) : (
                                        <div className="p-8 text-center text-[var(--text-muted)] text-xs">No active workflows.</div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                ) : (
                    <div className="bg-[var(--bg-panel)] p-8 rounded-2xl border border-[var(--border-main)] h-full flex flex-col items-center justify-center text-center text-[var(--text-muted)] border-dashed shadow-sm">
                        <div className="w-24 h-24 rounded-full bg-[var(--bg-app)] flex items-center justify-center mb-6 ring-1 ring-[var(--border-subtle)] shadow-inner relative group cursor-grab active:cursor-grabbing">
                            <div className="absolute inset-0 rounded-full border border-[var(--primary-500)]/10 animate-[spin_10s_linear_infinite]"></div>
                            <div className="absolute inset-2 rounded-full border border-[var(--primary-500)]/20 animate-[spin_15s_linear_infinite_reverse]"></div>
                            <Globe className="w-12 h-12 text-[var(--primary-500)] opacity-80" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">3D Network View</h3>
                        <p className="text-sm max-w-[200px] leading-relaxed mb-4">Select a node to inspect <span className="text-[var(--primary-600)] font-bold">threads, logs, and metrics</span>.</p>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)] bg-[var(--bg-app)] px-4 py-3 rounded-lg border border-[var(--border-main)] text-left">
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center">🖱️</div> Drag to Rotate</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center">🔍</div> Scroll to Zoom</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center">👆</div> Click Nodes</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
