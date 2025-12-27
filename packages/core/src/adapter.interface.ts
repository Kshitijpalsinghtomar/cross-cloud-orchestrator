export type ExecutionResult = {
    success: boolean;
    id?: string;
    /**
     * Classification of the error if success is false.
     * Defaults to NON_RETRYABLE if not provided.
     */
    errorType?: 'RETRYABLE' | 'NON_RETRYABLE' | 'TIMEOUT' | 'PROVIDER_DOWN' | 'AUTH_ERROR';
    errorCode?: string;
    details?: any;
    output?: any;
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
        details?: any
    }>;

    /**
     * Attempt to cancel a running execution.
     */
    cancel(execId: string): Promise<boolean>;

    /**
     * Health check for adapter's connectivity/auth
     */
    health(): Promise<{ ok: boolean; latencyMs?: number }>;

    /**
     * Static metadata about this provider adapter.
     */
    providerInfo?: {
        region: string;
        tier: 'STANDARD' | 'PREMIUM' | 'SPOT';
        costPerMs?: number; // Normalized cost factor
        complianceTags?: string[]; // e.g., ["EU", "GDPR", "HIPAA"]
    };
}
