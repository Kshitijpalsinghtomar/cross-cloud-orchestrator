import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import StatusBadge from './StatusBadge';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Clock, Play, ArrowRight, Activity, Search, Filter, FileJson, Edit3 } from 'lucide-react';

export default function WorkflowList() {
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 5;

    const { data, isLoading } = useQuery({
        queryKey: ['executions', page],
        queryFn: () => api.listExecutions({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
        placeholderData: (previousData) => previousData
    });

    const { data: definitions, isLoading: isLoadingDefs } = useQuery({
        queryKey: ['definitions'],
        queryFn: () => api.listDefinitions()
    });

    if (isLoading || isLoadingDefs) return <div className="flex items-center justify-center h-64 text-[var(--text-muted)] animate-pulse">Loading Dashboard...</div>;

    const executions = data?.items || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const handleNext = () => setPage(p => Math.min(totalPages, p + 1));
    const handlePrev = () => setPage(p => Math.max(1, p - 1));

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">Dashboard</h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">Overview of saved workflows and executions.</p>
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

            {/* Saved Definitions Section */}
            {definitions && definitions.length > 0 && (
                <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-main)] shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[var(--border-main)] bg-[var(--bg-app)] flex items-center gap-2">
                        <FileJson className="w-5 h-5 text-[var(--primary-600)]" />
                        <h2 className="font-semibold text-[var(--text-main)]">Saved Workflows</h2>
                        <span className="ml-auto text-xs text-[var(--text-muted)] bg-[var(--neutral-bg)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                            {definitions.length} definition{definitions.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {definitions.slice(0, 6).map((def: any) => (
                            <Link
                                key={def.id}
                                to={`/submit?load=${def.id}`}
                                className="group p-4 bg-[var(--bg-app)] hover:bg-[var(--neutral-bg)] border border-[var(--border-subtle)] rounded-lg transition-all hover:border-[var(--primary-600)] hover:shadow-md"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-semibold text-[var(--text-main)] truncate group-hover:text-[var(--primary-600)] transition-colors">
                                        {def.name || def.id}
                                    </h3>
                                    <Edit3 className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary-600)] transition-colors flex-shrink-0" />
                                </div>
                                <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">
                                    {def.description || `Workflow with ${def.definition?.steps?.length || 0} steps`}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                                    <Clock className="w-3 h-3" />
                                    <span>Updated {new Date(def.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                    {definitions.length > 6 && (
                        <div className="p-3 border-t border-[var(--border-subtle)] text-center">
                            <Link to="/submit" className="text-sm text-[var(--primary-600)] hover:underline">
                                View all {definitions.length} workflows →
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Executions List */}
            <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-main)] shadow-sm overflow-hidden transition-colors duration-300">
                <div className="p-4 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-app)]">
                    <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-green-500" />
                        <h2 className="font-semibold text-[var(--text-main)]">Recent Executions</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Search execution IDs..."
                                className="pl-9 pr-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/20 focus:border-[var(--primary-600)] w-64 transition-all text-[var(--text-main)]"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                            <span className="font-medium text-[var(--text-main)]">{(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)}</span> of <span className="font-medium text-[var(--text-main)]">{total}</span>
                        </div>
                    </div>
                </div>

                <div className="divide-y divide-[var(--border-subtle)]">
                    {executions.map((exec) => (
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
                            <h3 className="text-[var(--text-main)] font-medium">No executions yet</h3>
                            <p className="text-[var(--text-muted)] text-sm mt-1 max-w-sm mx-auto">Launch a workflow from the Studio to see executions here.</p>
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
