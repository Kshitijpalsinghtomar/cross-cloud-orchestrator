
import { useParams, Link } from 'react-router-dom';
import { useWorkflow } from '../hooks/useWorkflows';
import StatusBadge from './StatusBadge';
import { ArrowLeft, LayoutTemplate } from 'lucide-react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Position,
    MarkerType
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { useEffect } from 'react';

// --- Graph Logic ---

const getNodeColor = (status?: string) => {
    switch (status) {
        case 'COMPLETED': return '#dcfce7'; // green-100
        case 'FAILED': return '#fee2e2'; // red-100
        case 'RUNNING': return '#dbeafe'; // blue-100
        case 'PENDING': return '#f3f4f6'; // gray-100
        default: return '#ffffff';
    }
};

const getNodeBorder = (status?: string) => {
    switch (status) {
        case 'COMPLETED': return '#16a34a'; // green-600
        case 'FAILED': return '#dc2626'; // red-600
        case 'RUNNING': return '#2563eb'; // blue-600
        default: return '#9ca3af'; // gray-400
    }
};

export default function WorkflowDetails() {
    const { id } = useParams<{ id: string }>();
    const { data: execution, isLoading } = useWorkflow(id!);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useEffect(() => {
        if (!execution) return;

        // Transform Steps to Nodes
        // Simple Layout: We need to topologically sort to assign "Levels" (X-coordinate) or Y.
        // For simplicity: Simple vertical layout with manual offsets if not doing full dagre.
        // Actually, let's do a simple computed layout:

        const steps = execution.spec.steps;
        const stepMap = new Map(steps.map(s => [s.id, s]));
        const levels = new Map<string, number>();

        // Calculate levels (Depth)
        const getLevel = (stepId: string, visited = new Set<string>()): number => {
            if (visited.has(stepId)) return 0; // Cycle?
            if (levels.has(stepId)) return levels.get(stepId)!;

            visited.add(stepId);
            const step = stepMap.get(stepId);
            if (!step || !step.dependencies || step.dependencies.length === 0) {
                levels.set(stepId, 0);
                return 0;
            }

            const maxParentLevel = Math.max(...step.dependencies.map(d => getLevel(d, new Set(visited))));
            const level = maxParentLevel + 1;
            levels.set(stepId, level);
            return level;
        };

        steps.forEach(s => getLevel(s.id));

        // Group by level to calculate X position (center them)
        const nodesByLevel: Record<number, string[]> = {};
        steps.forEach(s => {
            const lvl = levels.get(s.id) || 0;
            if (!nodesByLevel[lvl]) nodesByLevel[lvl] = [];
            nodesByLevel[lvl].push(s.id);
        });

        // Create Nodes
        const newNodes: Node[] = steps.map(step => {
            const level = levels.get(step.id) || 0;
            const indexInLevel = nodesByLevel[level].indexOf(step.id);
            const levelWidth = nodesByLevel[level].length * 200;
            const x = (indexInLevel * 250) - (levelWidth / 2) + 125; // Centered
            const y = level * 150;

            const state = execution.stepStates[step.id];

            return {
                id: step.id,
                position: { x: x + 400, y: y + 50 }, // Offset to center in view
                data: {
                    label: (
                        <div className="text-center">
                            <div className="font-bold text-sm text-[var(--text-main)]">{step.id}</div>
                            <div className="text-[10px] font-mono text-[var(--text-muted)] mt-1">{state?.status || 'UNKNOWN'}</div>
                            {state?.error && <div className="text-[10px] text-red-600 mt-1 truncate max-w-[120px]">{state.error}</div>}
                        </div>
                    )
                },
                style: {
                    background: getNodeColor(state?.status),
                    border: `2px solid ${getNodeBorder(state?.status)} `,
                    borderRadius: '8px',
                    padding: '10px',
                    width: 180,
                    fontSize: '12px'
                },
                sourcePosition: Position.Bottom,
                targetPosition: Position.Top
            };
        });

        // Create Edges
        const newEdges: Edge[] = [];
        steps.forEach(step => {
            if (step.dependencies) {
                step.dependencies.forEach(dep => {
                    newEdges.push({
                        id: `${dep} -${step.id} `,
                        source: dep,
                        target: step.id,
                        type: 'smoothstep',
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' },
                        style: { stroke: '#9ca3af', strokeWidth: 2 }
                    });
                });
            }
        });

        setNodes(newNodes);
        setEdges(newEdges);

    }, [execution, setNodes, setEdges]);


    if (isLoading) return <div className="p-12 text-center text-gray-400">Loading details...</div>;
    if (!execution) return <div className="p-12 text-center text-red-400">Execution not found</div>;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="bg-[var(--bg-panel)] p-6 rounded-xl border border-[var(--border-main)] shadow-sm shrink-0">
                <div className="flex justify-between items-start">
                    <div>
                        <Link to="/" className="text-[var(--text-muted)] hover:text-[var(--primary-600)] text-sm flex items-center gap-1 mb-4 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold text-[var(--text-main)] font-mono">{execution.id}</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Workflow: <span className="font-medium text-[var(--text-main)]">{execution.spec.id}</span></p>
                    </div>
                    <StatusBadge status={execution.status} className="text-sm px-4 py-1.5" />
                </div>
            </div>

            {/* Content: Graph + Inspector */}
            <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">

                {/* Graph View */}
                <div className="col-span-2 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-main)] shadow-sm overflow-hidden relative">
                    <div className="absolute top-4 left-4 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-2 rounded-lg border border-[var(--border-main)]">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <LayoutTemplate className="w-4 h-4 text-[var(--primary-600)]" /> Workflow DAG
                        </h3>
                    </div>

                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        fitView
                        attributionPosition="bottom-right"
                    >
                        <Background color="#94a3b8" gap={16} size={1} />
                        <Controls />
                    </ReactFlow>
                </div>

                {/* Inspector / Details Sidebar */}
                <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-main)] shadow-sm flex flex-col min-h-0 overflow-hidden">
                    <div className="p-4 border-b border-[var(--border-main)] bg-[var(--neutral-bg)]">
                        <h3 className="font-bold text-[var(--text-main)]">Execution Details</h3>
                    </div>
                    <div className="p-4 overflow-y-auto space-y-6">

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                <span className="text-xs text-[var(--text-muted)] block mb-1">Duration</span>
                                <span className="text-sm font-mono font-bold">
                                    {(execution.status === 'COMPLETED' || execution.status === 'FAILED')
                                        ? `${((execution.updatedAt - execution.createdAt) / 1000).toFixed(2)} s`
                                        : 'Running...'}
                                </span>
                            </div>
                            <div className="bg-[var(--bg-app)] p-3 rounded-lg border border-[var(--border-subtle)]">
                                <span className="text-xs text-[var(--text-muted)] block mb-1">Steps</span>
                                <span className="text-sm font-mono font-bold">{execution.spec.steps.length}</span>
                            </div>
                        </div>

                        {/* Step States List */}
                        <div>
                            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Step Statuses</h4>
                            <div className="space-y-2">
                                {Object.values(execution.stepStates).map(state => (
                                    <div key={state.stepId} className="flex justify-between items-center text-xs p-2 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)]">
                                        <span className="font-medium text-[var(--text-main)]">{state.stepId}</span>
                                        <span className={`px - 1.5 py - 0.5 rounded ${getNodeColor(state.status)} text - [var(--text - main)] border border - [var(--border - subtle)]`}>
                                            {state.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Results */}
                        {execution.results && (
                            <div>
                                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Results</h4>
                                <pre className="text-[10px] font-mono bg-[var(--neutral-bg)] p-3 rounded-lg border border-[var(--border-subtle)] overflow-x-auto text-[var(--text-muted)]">
                                    {JSON.stringify(execution.results, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
