export type ExecutionResult = {
    success: boolean;
    id?: string;
    errorCode?: string;
    details?: any;
};
export interface CloudAdapter {
    /**
     * Accepts a step payload and returns immediately with an execution id or error.
     */
    executeStep(stepId: string, payload: any): Promise<ExecutionResult>;
    /**
     * Query status of an execution by id.
     */
    getStatus(execId: string): Promise<{
        status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
        details?: any;
    }>;
    /**
     * Attempt to cancel a running execution.
     */
    cancel(execId: string): Promise<boolean>;
    /**
     * Health check for adapter's connectivity/auth
     */
    health(): Promise<{
        ok: boolean;
        latencyMs?: number;
    }>;
}
