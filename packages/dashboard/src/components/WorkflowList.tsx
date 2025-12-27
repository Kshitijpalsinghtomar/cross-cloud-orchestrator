import { useWorkflows } from '../hooks/useWorkflows';
import StatusBadge from './StatusBadge';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Clock, Play, CheckCircle2, AlertCircle, ArrowRight, Activity, Search, Filter } from 'lucide-react';

function StatsCard({ title, value, icon: Icon, colorClass, bgClass }: any) {
    return (
        <div className="bg-[var(--bg-panel)] p-6 rounded-xl border border-[var(--border-main)] shadow-sm flex items-start justify-between card-shadow">
            <div>
                <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
                <h3 className="text-2xl font-bold text-[var(--text-main)] mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${bgClass} ${colorClass} opacity-90`}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
    );
}

export default function WorkflowList() {
    const { data: allExecutions, isLoading } = useWorkflows();
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 5;

    if (isLoading) return <div className="flex items-center justify-center h-64 text-[var(--text-muted)] animate-pulse">Loading Dashboard...</div>;

    const executions = allExecutions || [];
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'COMPLETED').length;
    const failed = executions.filter(e => e.status === 'FAILED').length;

    // Pagination Logic
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const startIndex = (page - 1) * PAGE_SIZE;
    const currentExecutions = executions.slice(startIndex, startIndex + PAGE_SIZE);

    const handleNext = () => setPage(p => Math.min(totalPages, p + 1));
    const handlePrev = () => setPage(p => Math.max(1, p - 1));

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">Dashboard</h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Overview of all workflow executions.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors shadow-sm flex items-center gap-2">
                        <Filter className="w-4 h-4 text-[var(--text-muted)]" /> Filter
                    </button>
                    <Link to="/submit" className="px-4 py-2 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white rounded-lg text-sm font-bold shadow-md shadow-[var(--primary-100)] transition-all flex items-center gap-2">
                        <Play className="w-4 h-4" /> New Workflow
                    </Link>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard title="Total Executions" value={total} icon={Activity} colorClass="text-[var(--primary-600)]" bgClass="bg-[var(--primary-50)]" />
                <StatsCard title="Completed" value={completed} icon={CheckCircle2} colorClass="text-[var(--success-text)]" bgClass="bg-[var(--success-bg)]" />
                <StatsCard title="Failed" value={failed} icon={AlertCircle} colorClass="text-[var(--error-text)]" bgClass="bg-[var(--error-bg)]" />
            </div>

            {/* List */}
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-main)] shadow-sm overflow-hidden transition-colors duration-300">
                <div className="p-4 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-app)]">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search execution IDs..."
                            className="pl-9 pr-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/20 focus:border-[var(--primary-600)] w-64 transition-all text-[var(--text-main)]"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text-main)]">{startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, total)}</span> of <span className="font-medium text-[var(--text-main)]">{total}</span>
                    </div>
                </div>

                <div className="divide-y divide-[var(--border-subtle)]">
                    {currentExecutions.map((exec) => (
                        <div
                            key={exec.id}
                            className="p-5 hover:bg-[var(--bg-app)] transition-colors group flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                <StatusBadge status={exec.status} />
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-mono text-[var(--text-main)] font-semibold">{exec.id}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(exec.createdAt).toLocaleTimeString()}</span>
                                        <span>•</span>
                                        <span className="font-mono text-[10px] bg-[var(--neutral-bg)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">{exec.spec.id}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <Link
                                    to={`/execution/${exec.id}`}
                                    className="text-[var(--text-muted)] hover:text-[var(--primary-600)] transition-colors p-2 rounded-lg hover:bg-[var(--bg-app)]"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>
                    ))}

                    {total === 0 && (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 bg-[var(--bg-app)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
                                <Activity className="w-8 h-8" />
                            </div>
                            <h3 className="text-[var(--text-main)] font-medium">No workflows yet</h3>
                            <p className="text-[var(--text-muted)] text-sm mt-1 max-w-sm mx-auto">Get started by launching your first cross-cloud workflow from the submission page.</p>
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {total > PAGE_SIZE && (
                    <div className="p-4 border-t border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-app)]">
                        <button
                            onClick={handlePrev}
                            disabled={page === 1}
                            className="px-3 py-1 text-sm border border-[var(--border-subtle)] rounded bg-[var(--bg-panel)] disabled:opacity-50 hover:bg-[var(--bg-subtle)] transition-colors"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</span>
                        <button
                            onClick={handleNext}
                            disabled={page === totalPages}
                            className="px-3 py-1 text-sm border border-[var(--border-subtle)] rounded bg-[var(--bg-panel)] disabled:opacity-50 hover:bg-[var(--bg-subtle)] transition-colors"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
