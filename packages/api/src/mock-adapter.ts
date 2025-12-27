import { CloudAdapter, ExecutionResult } from '@cc-orch/core';

export class MockAdapter implements CloudAdapter {
    constructor(
        public providerName: string = 'MockProvider',
        private shouldFail: boolean = false
    ) { }

    setOutage(isDown: boolean) {
        this.shouldFail = isDown;
    }

    async executeStep(stepId: string, payload: any): Promise<ExecutionResult> {
        if (this.shouldFail) {
            return {
                id: `mock-fail-${Date.now()}`,
                success: false,
                errorCode: 'PROVIDER_DOWN',
                details: `Simulated outage for ${this.providerName}`
            };
        }

        if (stepId === 'flakey-func' && Math.random() < 0.3) {
            return {
                id: `mock-flake-${Date.now()}`,
                success: false,
                errorCode: 'TIMEOUT',
                details: `Simulated transient failure for ${this.providerName}`
            };
        }

        return {
            id: `mock-exec-${Date.now()}`,
            success: true,
            output: {
                message: `Executed ${stepId} on ${this.providerName}`,
                input: payload
            }
        };
    }

    async getStatus(executionId: string): Promise<{ status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'; details?: any; }> {
        return { status: 'SUCCEEDED' };
    }

    async cancel(execId: string): Promise<boolean> {
        return true;
    }

    async health(): Promise<{ ok: boolean; latencyMs?: number }> {
        return {
            ok: !this.shouldFail,
            latencyMs: 10
        };
    }

    // Legacy method support if needed or strict interface compliance
    registerFunction(id: string, fn: any) {
        // Validation only
    }

    // Helper for Chaos
    checkHealth() { return this.health(); }
}
