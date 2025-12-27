import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export default function RegionMap() {
    const { data: health } = useQuery({ queryKey: ['health'], queryFn: api.getHealth });

    // Mock coordinates for regions (simplified)
    const coordinates: Record<string, { x: number, y: number }> = {
        'us-east-1': { x: 25, y: 35 },
        'us-west-2': { x: 15, y: 35 },
        'eu-west-1': { x: 48, y: 25 },
        'ap-northeast-1': { x: 85, y: 35 },
        'us-central1': { x: 20, y: 32 },
        'eastus': { x: 28, y: 36 },
        'ap-southeast-2': { x: 88, y: 70 },
    };

    return (
        <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-main)] overflow-hidden relative h-[300px] w-full shadow-sm">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                {/* Simplified World Map SVG Background */}
                <svg viewBox="0 0 100 50" className="w-full h-full text-[var(--text-main)] fill-current">
                    <path d="M10,25 Q20,10 40,20 T70,30 T90,20" stroke="currentColor" fill="none" strokeWidth="0.5" />
                    {/* Abstract continents outline (very simplified for impact) */}
                    <path d="M5,10 L15,10 L15,40 L5,40 Z" fill="currentColor" /> {/* Americas */}
                    <path d="M40,10 L55,10 L55,30 L40,30 Z" fill="currentColor" /> {/* Europe/Africa */}
                    <path d="M70,10 L90,10 L90,40 L70,40 Z" fill="currentColor" /> {/* Asia/Aus */}
                </svg>
            </div>

            <div className="absolute top-4 left-4 z-10">
                <h3 className="text-sm font-bold text-[var(--text-main)]">Global Infrastructure</h3>
                <p className="text-xs text-[var(--text-muted)]">Live Region Status</p>
            </div>

            {health?.providers?.map((p: any) => {
                const coords = coordinates[p.region] || { x: 50, y: 50 };
                const isOnline = p.status === 'Online';
                return (
                    <div
                        key={p.provider}
                        className="absolute flex flex-col items-center group cursor-default"
                        style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                    >
                        <div className={`w-3 h-3 rounded-full border-2 border-[var(--bg-panel)] shadow-sm ${isOnline ? 'bg-[var(--success-text)]' : 'bg-[var(--error-text)]'} relative`}>
                            {isOnline && <div className="absolute inset-0 rounded-full bg-[var(--success-text)] animate-ping opacity-75" />}
                        </div>
                        <div className="mt-1 px-2 py-1 bg-[var(--bg-panel)] rounded border border-[var(--border-subtle)] text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20">
                            <strong>{p.provider}</strong>
                            <div className="text-[var(--text-muted)]">{p.region}</div>
                            <div className={`${isOnline ? 'text-[var(--success-text)]' : 'text-[var(--error-text)]'}`}>{p.status}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
