import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Server, Layers, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function WorkflowDetails() {
    const { id } = useParams<{ id: string }>();
    const { data: execution, isLoading } = useQuery({
        queryKey: ['execution', id],
        queryFn: () => api.getExecution(id!),
        enabled: !!id,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return (status === 'COMPLETED' || status === 'FAILED') ? false : 1000;
        }
    });

    if (isLoading) return <div className="text-[var(--text-muted)] p-12 flex justify-center">Loading Details...</div>;
    if (!execution) return <div className="text-[var(--error-text)] p-12">Execution not found.</div>;

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="bg-[var(--bg-panel)] p-8 rounded-xl border border-[var(--border-main)] shadow-sm">
                <div>
                    <Link to="/" className="text-[var(--text-muted)] hover:text-[var(--primary-600)] text-sm flex items-center gap-1 mb-6 transition-colors font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight font-mono">{execution.executionId}</h1>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5
                    ${execution.status === 'COMPLETED'
                                ? 'bg-[var(--success-bg)] border-[var(--success-bg)] text-[var(--success-text)]' :
                                execution.status === 'FAILED'
                                    ? 'bg-[var(--error-bg)] border-[var(--error-bg)] text-[var(--error-text)]' :
                                    'bg-[var(--primary-50)] border-[var(--primary-50)] text-[var(--primary-600)]'
                            }`}>
                            {execution.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {execution.status === 'FAILED' && <AlertCircle className="w-3.5 h-3.5" />}
                            {execution.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                            {execution.status}
                        </span>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span className="text-[var(--text-muted)] font-medium">Started {new Date(execution.startedAt).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Timeline Column */}
                <div className="col-span-2 space-y-6">
                    <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Layers className="text-[var(--primary-600)] w-5 h-5" /> Execution Timeline
                    </h3>

                    <div className="relative pl-8 border-l-2 border-[var(--border-subtle)] space-y-8 py-2">
                        {execution.history.map((event, i) => (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i}
                                className="relative"
                            >
                                {/* Dot */}
                                <div className={`absolute -left-[39px] top-1.5 w-5 h-5 rounded-full border-4 border-[var(--bg-app)] shadow-sm
                            ${event.type.includes('COMPLETED') ? 'bg-[var(--success-text)]' :
                                        event.type.includes('FAILED') ? 'bg-[var(--error-text)]' :
                                            'bg-[var(--primary-600)]'}
                        `} />

                                <div className="bg-[var(--bg-panel)] p-5 rounded-xl border border-[var(--border-main)] shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-[var(--text-main)] tracking-tight">{event.type}</span>
                                        <span className="font-mono text-xs text-[var(--text-muted)] bg-[var(--neutral-bg)] px-2 py-1 rounded">{new Date(event.timestamp).toLocaleTimeString()}</span>
                                    </div>

                                    {event.stepId && (
                                        <div className="text-xs text-[var(--primary-600)] font-medium mb-3 flex items-center gap-1.5 bg-[var(--primary-50)] w-fit px-2 py-1 rounded">
                                            <Server className="w-3 h-3" /> Step: {event.stepId}
                                        </div>
                                    )}

                                    {!!event.details && (
                                        <div className="bg-[var(--neutral-bg)] p-3 rounded-lg border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-muted)] overflow-x-auto">
                                            <pre>{JSON.stringify(event.details as any, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Context Column */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Database className="text-[var(--success-text)] w-5 h-5" /> Live Context
                    </h3>
                    <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-main)] shadow-sm overflow-hidden sticky top-8">
                        <div className="bg-[var(--neutral-bg)] p-3 border-b border-[var(--border-subtle)] flex justify-between items-center">
                            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">State Memory</h4>
                            <span className="text-[10px] text-[var(--text-muted)]">{Object.keys(execution.context).length} keys</span>
                        </div>
                        <div className="p-4 bg-[var(--bg-panel)]">
                            <pre className="text-xs font-mono text-[var(--text-muted)] overflow-auto max-h-[500px]">
                                {JSON.stringify(execution.context, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
