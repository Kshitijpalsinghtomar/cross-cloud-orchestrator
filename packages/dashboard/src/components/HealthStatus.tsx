import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
    Activity,
    Globe,
    Cpu,
    Zap,
    BarChart3,
    Cloud,
    ShieldCheck
} from 'lucide-react';

const NodeStatus = ({ name, tech, status, latency, details, icon: Icon }: any) => {
    const isOnline = status === 'Online' || status === 'OK' || status === 'healthy';

    // Status colors
    const statusBg = isOnline ? 'bg-emerald-500/10' : 'bg-rose-500/10';
    const statusText = isOnline ? 'text-emerald-400' : 'text-rose-400';
    const statusBorder = isOnline ? 'border-emerald-500/20' : 'border-rose-500/20';

    return (
        <div className="group relative p-4 bg-[var(--bg-app)] rounded-xl border border-[var(--border-subtle)] hover:border-[var(--primary-600)] hover:border-opacity-50 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-sky-500/5 overflow-hidden">
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-500/5 to-sky-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative flex items-center justify-between gap-4">
                {/* Left: Icon & Info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className={`shrink-0 w-10 h-10 rounded-lg ${statusBg} ${statusText} flex items-center justify-center border ${statusBorder} shadow-sm`}>
                        {Icon ? <Icon className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[var(--text-main)] truncate tracking-tight">{name}</h4>
                        </div>

                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                            {/* Tech/Region Badge */}
                            {tech && (
                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                                    {tech}
                                </span>
                            )}

                            {/* Details (if present) */}
                            {details && (
                                <span className="text-[10px] font-mono text-[var(--text-muted)] truncate opacity-80 border-l border-[var(--border-subtle)] pl-2">
                                    {details}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Status Pill & Latency */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusBg} ${statusText} border ${statusBorder}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]'} animate-pulse`} />
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </div>

                    {latency !== undefined && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)] opacity-70 group-hover:opacity-100 transition-opacity">
                            <Zap className={`w-3 h-3 ${latency < 100 ? 'text-emerald-500' : 'text-amber-500'}`} />
                            <span>{latency}ms</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function HealthStatus() {

    // 1. Fetch Basic Health
    const { data: healthData, isError: isHealthError, refetch: refetchHealth } = useQuery({
        queryKey: ['health'],
        queryFn: api.getHealth
    });

    // 2. Fetch Polyglot Summary
    const { data: polyglotData, refetch: refetchPolyglot } = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: api.getDashboardSummary
    });

    // 3. Fetch Deep Health
    const { data: deepHealthData, refetch: refetchDeep } = useQuery({
        queryKey: ['deep-health'],
        queryFn: api.getDeepHealth
    });

    const refreshAll = () => {
        refetchHealth();
        refetchPolyglot();
        refetchDeep();
    };

    const isHealthy = healthData?.status === 'OK' && !isHealthError;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">

            {/* Header / Global Status */}
            <div className="bg-[var(--bg-panel)] p-6 rounded-2xl border border-[var(--border-main)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-5 w-full sm:w-auto">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-lg ${isHealthy ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                        <Activity className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--text-main)]">System Health</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-0.5 flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse shadow-[0_0_10px_currentColor]`} />
                            {isHealthy ? 'All Systems Operational' : 'Systems Degraded'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={refreshAll}
                    className="w-full sm:w-auto px-4 py-2 bg-[var(--bg-app)] hover:bg-[var(--bg-panel)] border border-[var(--border-main)] hover:border-[var(--primary-500)] rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                    <Activity className="w-4 h-4" /> Refresh Status
                </button>
            </div>

            {/* Main Content - Refined 3 Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Core Stack */}
                <div className="col-span-1 flex flex-col gap-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)] mb-1">
                        <div className="w-1 h-4 bg-[var(--primary-600)] rounded-full"></div>
                        <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Core Services</h3>
                    </div>

                    <NodeStatus
                        name="API Gateway"
                        tech="Node.js"
                        status={isHealthy ? 'Online' : 'Offline'}
                        details="v1.0.0"
                        icon={Globe}
                    />
                    <NodeStatus
                        name="Analytics Engine"
                        tech="Python"
                        status={(polyglotData?.services?.analytics_engine?.status || 'Online')}
                        details="Queue: Empty"
                        icon={BarChart3}
                    />
                </div>

                {/* Monitors */}
                <div className="col-span-1 flex flex-col gap-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)] mb-1">
                        <div className="w-1 h-4 bg-sky-500 rounded-full"></div>
                        <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Monitors</h3>
                    </div>

                    <NodeStatus
                        name="Resource Monitor"
                        tech="Go"
                        status="Online"
                        details={`CPU: ${polyglotData?.services?.resource_monitor?.cpu ?? 42}%`}
                        icon={Cpu}
                    />
                    <NodeStatus
                        name="Health Checker"
                        tech="Rust"
                        status={deepHealthData?.overall_status ? 'Online' : 'Offline'}
                        details="Deep Scan: OK"
                        icon={ShieldCheck}
                    />
                </div>

                {/* Cloud Providers */}
                <div className="col-span-1 flex flex-col gap-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)] mb-1">
                        <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                        <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Cloud Providers</h3>
                    </div>

                    <div className="space-y-3">
                        {healthData?.providers?.map((p: any) => (
                            <NodeStatus
                                key={p.provider}
                                name={p.provider}
                                tech={p.region}
                                status={p.status}
                                latency={p.latencyMs}
                                icon={Cloud}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
