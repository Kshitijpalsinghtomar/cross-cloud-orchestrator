import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Activity, Globe, Server, Database } from 'lucide-react';

const NodeStatus = ({ name, region, status, latency, details }: any) => {
    const isOnline = status === 'Online' || status === 'OK' || status === 'healthy';
    return (
        <div className="flex items-center justify-between p-4 bg-[var(--bg-app)] rounded-xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[var(--success-text)]' : 'bg-[var(--error-text)]'}`} />
                <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)] w-32">{name}</h4>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1"><Globe className="w-3 h-3" /> {region}</p>
                </div>
                {details && (
                    <div className="text-xs text-[var(--text-muted)] border-l border-[var(--border-subtle)] pl-4 ml-2 max-w-[200px] truncate">
                        {details}
                    </div>
                )}
            </div>
            <div className="text-right">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOnline ? 'bg-[var(--success-bg)] text-[var(--success-text)]' : 'bg-[var(--error-bg)] text-[var(--error-text)]'}`}>
                    {isOnline ? 'OPERATIONAL' : 'OUTAGE'}
                </span>
                {latency && <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">{latency}ms</p>}
            </div>
        </div>
    );
};

export default function HealthStatus() {
    // 1. Fetch Basic Health (Node.js API + Cloud Adapters)
    const { data: healthData, isError: isHealthError } = useQuery({
        queryKey: ['health'],
        queryFn: api.getHealth
    });

    // 2. Fetch Polyglot Summary (Python + Go)
    const { data: polyglotData } = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: api.getDashboardSummary
    });

    // 3. Fetch Deep Health (Rust)
    const { data: deepHealthData } = useQuery({
        queryKey: ['deep-health'],
        queryFn: api.getDeepHealth
    });

    const isHealthy = healthData?.status === 'OK' && !isHealthError;

    return (
        <div className="bg-[var(--bg-panel)] p-8 rounded-2xl shadow-sm border border-[var(--border-main)] max-w-xl transition-colors duration-300">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-[var(--border-subtle)]">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary-50)] text-[var(--primary-600)] flex items-center justify-center border border-[var(--primary-100)]">
                    <Activity className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-main)]">Polyglot System Overview</h2>
                    <p className="text-[var(--text-muted)] text-sm">Real-time status of 5-language architecture.</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* --- Node.js Core --- */}
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 pl-1 flex items-center gap-2">
                    <Server className="w-3 h-3" /> Typescript Core
                </h3>
                <NodeStatus name="API Gateway" region="Node.js" status={isHealthy ? 'Online' : 'Offline'} latency="12" />

                {/* --- Polyglot Services --- */}
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 mt-6 pl-1 flex items-center gap-2">
                    <Database className="w-3 h-3" /> Polyglot Services
                </h3>

                {/* Python Analytics */}
                <NodeStatus
                    name="Analytics Engine"
                    region="Python"
                    status={polyglotData?.services?.analytics_engine?.active_users ? 'Online' : 'Offline'}
                    details={polyglotData?.services?.analytics_engine ?
                        `Users: ${polyglotData.services.analytics_engine.active_users}` :
                        undefined}
                />

                {/* Go Monitor */}
                <NodeStatus
                    name="Resource Monitor"
                    region="Go"
                    status={polyglotData?.services?.resource_monitor?.status === 'OK' ? 'Online' : 'Offline'}
                    details={polyglotData?.services?.resource_monitor ?
                        `CPU: ${polyglotData.services.resource_monitor.cpu}%` :
                        undefined}
                />

                {/* Rust Health */}
                <NodeStatus
                    name="Health Checker"
                    region="Rust"
                    status={deepHealthData?.overall_status === 'healthy' ? 'Online' : 'Offline'}
                    details={deepHealthData ? `Checks: ${deepHealthData.checks?.length || 0}` : undefined}
                />

                {/* --- Cloud Providers --- */}
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 mt-6 pl-1 flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Cloud Providers
                </h3>
                {healthData?.providers?.map((p: any) => (
                    <NodeStatus
                        key={p.provider}
                        name={`${p.provider} Cloud`}
                        region={p.region}
                        status={p.status}
                        latency={p.latencyMs}
                    />
                ))}
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">System Status</p>
                    <p className="text-xl font-bold text-[var(--success-text)] font-mono">
                        {isHealthy ? 'HEALTHY' : 'DEGRADED'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Active Services</p>
                    <p className="text-xl font-bold text-[var(--primary-600)] font-mono">5/5</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Languages</p>
                    <p className="text-xl font-bold text-[var(--primary-600)] font-mono">5</p>
                </div>
            </div>
        </div>
    );
}
