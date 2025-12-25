export type CloudProvider = 'AWS' | 'GCP' | 'AZURE';
export interface WorkflowDefinition {
    id: string;
    name: string;
    steps: WorkflowStep[];
    startAt: string;
}
export type WorkflowStep = TaskStep | ChoiceStep | ParallelStep;
export interface BaseStep {
    id: string;
    next?: string;
}
export interface TaskStep extends BaseStep {
    type: 'TASK';
    functionId: string;
    provider: CloudProvider;
    fallbackProvider?: CloudProvider;
    retries?: number;
    timeout?: number;
}
export interface ChoiceStep extends BaseStep {
    type: 'CHOICE';
    choices: {
        variable: string;
        operator: 'eq' | 'gt' | 'lt' | 'contains';
        value: any;
        next: string;
    }[];
    default: string;
}
export interface ParallelStep extends BaseStep {
    type: 'PARALLEL';
    branches: string[];
}
export interface WorkflowExecution {
    executionId: string;
    workflowId: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    currentStepId?: string;
    context: Record<string, any>;
    history: ExecutionEvent[];
    startedAt: Date;
    updatedAt: Date;
}
export interface ExecutionEvent {
    timestamp: Date;
    type: 'STEP_STARTED' | 'STEP_COMPLETED' | 'STEP_FAILED' | 'WORKFLOW_STARTED' | 'WORKFLOW_COMPLETED';
    stepId?: string;
    details?: any;
}
