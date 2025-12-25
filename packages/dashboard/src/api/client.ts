import axios from 'axios';

const API_BASE = '/api';

export interface Execution {
    executionId: string;
    workflowId: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    currentStepId?: string;
    context: Record<string, unknown>;
    history: {
        timestamp: string;
        type: string;
        stepId?: string;
        details?: unknown;
    }[];
    startedAt: string;
    updatedAt: string;
}

export interface ProviderHealth {
    provider: string;
    status: 'Online' | 'Offline' | 'Degraded';
    latencyMs: number;
    region: string;
    lastChecked: string;
    error?: string;
}

export interface HealthStatus {
    status: string;
    version: string;
    providers: ProviderHealth[];
}

export const api = {
    async getHealth(): Promise<HealthStatus> {
        const res = await axios.get(`${API_BASE}/health`);
        return res.data;
    },

    async listExecutions(): Promise<Execution[]> {
        const res = await axios.get(`${API_BASE}/executions`);
        return res.data;
    },

    async getExecution(id: string): Promise<Execution> {
        const res = await axios.get(`${API_BASE}/executions/${id}`);
        return res.data;
    },

    async submitWorkflow(workflow: unknown, input: unknown): Promise<{ executionId: string }> {
        const res = await axios.post(`${API_BASE}/executions`, { workflow, input });
        return res.data;
    }
};
