import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Activity, Globe } from 'lucide-react';

const NodeStatus = ({ name, region, status, latency }: any) => {
    const isOnline = status === 'Online';
    return (
        <div className="flex items-center justify-between p-4 bg-[var(--bg-app)] rounded-xl border border-[var(--border-subtle)]">
            <div className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-[var(--success-text)]' : 'bg-[var(--error-text)]'}`} />
                <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">{name}</h4>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1"><Globe className="w-3 h-3" /> {region}</p>
                </div>
            </div>
            <div className="text-right">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOnline ? 'bg-[var(--success-bg)] text-[var(--success-text)]' : 'bg-[var(--error-bg)] text-[var(--error-text)]'}`}>
                    {isOnline ? 'OPERATIONAL' : 'OUTAGE'}
                </span>
                <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">{latency}ms latency</p>
            </div>
        </div>
    );
};

export default function HealthStatus() {
    const { data, isError } = useQuery({
        queryKey: ['health'],
        queryFn: api.getHealth
    });

    const isHealthy = data?.status === 'OK' && !isError;

    return (
        <div className="bg-[var(--bg-panel)] p-8 rounded-2xl shadow-sm border border-[var(--border-main)] max-w-xl transition-colors duration-300">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-[var(--border-subtle)]">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary-50)] text-[var(--primary-600)] flex items-center justify-center border border-[var(--primary-100)]">
                    <Activity className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-main)]">System Diagnostics</h2>
                    <p className="text-[var(--text-muted)] text-sm">Real-time infrastructure telemetry.</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 pl-1">Core Services</h3>
                <NodeStatus name="API Gateway" region="Global Edge" status={isHealthy ? 'Online' : 'Offline'} latency="24" />

                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 mt-6 pl-1">Cloud Providers</h3>
                {data?.providers?.map((p) => (
                    <NodeStatus
                        key={p.provider}
                        name={`${p.provider} Provider`}
                        region={p.region}
                        status={p.status}
                        latency={p.latencyMs}
                    />
                ))}
                {!data?.providers && <div className="text-sm text-[var(--text-muted)] italic p-4 bg-[var(--bg-app)] rounded-lg">No providers connected.</div>}
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Uptime</p>
                    <p className="text-xl font-bold text-[var(--success-text)] font-mono">99.9%</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Active Nodes</p>
                    <p className="text-xl font-bold text-[var(--primary-600)] font-mono">{data?.providers?.length || 0}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Avg Latency</p>
                    <p className="text-xl font-bold text-[var(--primary-600)] font-mono">
                        {data?.providers
                            ? Math.round(data.providers.reduce((acc, p) => acc + p.latencyMs, 0) / data.providers.length) + 'ms'
                            : '--'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
