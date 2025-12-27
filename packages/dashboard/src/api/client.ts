import axios from 'axios';

const API_BASE = '/api';

export interface Execution {
    id: string; // WorkflowState.id
    idempotencyKey?: string;
    spec: {
        id: string;
        steps: Array<{
            id: string;
            dependencies?: string[];
            primary?: string;
        }>;
    };
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    stepStates: Record<string, {
        stepId: string;
        status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
        attempts: number;
        output?: any;
        error?: any;
    }>;
    results?: Record<string, any>;
    createdAt: number;
    updatedAt: number;
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

    async getDashboardSummary(): Promise<any> {
        const res = await axios.get(`${API_BASE}/dashboard/summary`);
        return res.data;
    },

    async getDeepHealth(): Promise<any> {
        const res = await axios.get(`${API_BASE}/system/health-deep`);
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
    },

    async toggleChaos(provider: string, isDown: boolean): Promise<any> {
        const res = await axios.post(`${API_BASE}/admin/chaos`, { provider, isDown });
        return res.data;
    }
};
