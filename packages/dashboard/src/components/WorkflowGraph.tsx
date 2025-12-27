import { useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Handle,
    Position,
    type Node,
    type Edge,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Bot, Cloud, PlayCircle, Box } from 'lucide-react';

// Custom Node Types
const StepNode = ({ data }: { data: any }) => {
    const isStart = data.type === 'START';
    const Icon = isStart ? PlayCircle : (data.provider === 'AWS' ? Cloud : (data.provider === 'AI' ? Bot : Box));

    return (
        <div className={`
            px-4 py-3 rounded-lg shadow-md border-2 min-w-[150px]
            ${isStart
                ? 'bg-[var(--primary-600)] border-[var(--primary-700)] text-white'
                : 'bg-[var(--bg-panel)] border-[var(--border-main)] text-[var(--text-main)]'}
        `}>
            {!isStart && <Handle type="target" position={Position.Top} className="!bg-[var(--text-muted)]" />}

            <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${isStart ? 'text-white' : 'text-[var(--primary-600)]'}`} />
                <span className="font-bold text-xs uppercase tracking-wider opacity-80">{data.type || 'STEP'}</span>
            </div>
            <div className="font-semibold text-sm truncate">{data.label}</div>

            {!isStart && (
                <div className="mt-2 text-[10px] opacity-70 flex justify-between border-t border-current/10 pt-1">
                    <span>{data.provider}</span>
                    <span className="font-mono">{data.id}</span>
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="!bg-[var(--text-muted)]" />
        </div>
    );
};

const nodeTypes = {
    step: StepNode
};

interface WorkflowGraphProps {
    workflow: any; // WorkflowSpec
}

export default function WorkflowGraph({ workflow }: WorkflowGraphProps) {

    // Transform WorkflowSpec to Nodes/Edges
    const { nodes, edges } = useMemo(() => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        if (!workflow || !workflow.steps) return { nodes, edges };

        // Simple layout: Vertical stack
        // TODO: Use dagre for complex DAGs
        let y = 50;
        const x = 250;

        // Start Node
        nodes.push({
            id: 'start',
            type: 'step',
            position: { x, y: 0 },
            data: { label: 'Start', type: 'START' }
        });

        // Step Nodes
        workflow.steps.forEach((step: any, index: number) => {
            nodes.push({
                id: step.id,
                type: 'step',
                position: { x, y },
                data: {
                    label: step.id, // Or step.name if available
                    id: step.id,
                    type: step.type,
                    provider: step.provider,
                    functionId: step.functionId
                }
            });

            // Edge from previous
            const prevId = index === 0 ? 'start' : workflow.steps[index - 1].id;
            edges.push({
                id: `e-${prevId}-${step.id}`,
                source: prevId,
                target: step.id,
                type: 'smoothstep',
                animated: true,
                style: { stroke: 'var(--text-muted)', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-muted)' }
            });

            y += 150;
        });

        return { nodes, edges };
    }, [workflow]);

    return (
        <div className="w-full h-full min-h-[400px] bg-[var(--neutral-bg)] rounded-xl overflow-hidden border border-[var(--border-main)]">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background color="var(--border-subtle)" gap={16} />
                <Controls className="!bg-[var(--bg-panel)] !border-[var(--border-main)] !fill-[var(--text-main)]" />
            </ReactFlow>
        </div>
    );
}
