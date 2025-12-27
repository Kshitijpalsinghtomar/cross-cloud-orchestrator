import { WorkflowEngine, InMemoryStateStore, SqliteStateStore } from '../engine';
import { CloudAdapter, ExecutionResult } from '../adapter.interface';

// --- Mocks ---
class MockAdapter implements CloudAdapter {
    constructor(private behave: 'SUCCEED' | 'FAIL' | 'TIMEOUT' = 'SUCCEED') { }

    async executeStep(stepId: string, payload: any): Promise<ExecutionResult> {
        if (this.behave === 'FAIL') return { success: false, errorCode: 'MOCK_FAIL' };
        return { success: true, id: 'mock-exec-' + Math.random() };
    }

    async getStatus(execId: string) {
        if (this.behave === 'TIMEOUT') return { status: 'RUNNING' as const };
        return { status: 'SUCCEEDED' as const };
    }
    async cancel(execId: string) { return true; }
    async health() { return { ok: true }; }
}

describe('WorkflowEngine', () => {
    let engine: WorkflowEngine;

    beforeEach(() => {
        engine = new WorkflowEngine(new InMemoryStateStore());
    });

    test('should run a simple success workflow', async () => {
        engine.registerAdapter('mock-provider', new MockAdapter('SUCCEED'));
        const spec = {
            id: 'test-wf',
            steps: [{ id: 'step1', primary: 'mock-provider', payload: {} }]
        };

        const id = await engine.submitWorkflow(spec);

        // Wait for async execution
        await new Promise(r => setTimeout(r, 100));

        const status = await engine.getStatus(id);
        expect(status?.status).toBe('COMPLETED');
        expect(status?.currentStep).toBe(1);
    });

    test('should failover to secondary provider', async () => {
        engine.registerAdapter('primary', new MockAdapter('FAIL'));
        engine.registerAdapter('secondary', new MockAdapter('SUCCEED'));

        const spec = {
            id: 'failover-wf',
            steps: [{
                id: 'step1',
                primary: 'primary',
                fallbacks: ['secondary'],
                payload: {}
            }]
        };

        const id = await engine.submitWorkflow(spec);
        await new Promise(r => setTimeout(r, 100));

        const status = await engine.getStatus(id);
        expect(status?.status).toBe('COMPLETED');

        const history = status?.providerHistory || [];
        expect(history).toHaveLength(2);
        expect(history[0].provider).toBe('primary');
        expect(history[0].success).toBe(false);
        expect(history[1].provider).toBe('secondary');
        expect(history[1].success).toBe(true);
    });

    test('should fail if all providers fail', async () => {
        engine.registerAdapter('primary', new MockAdapter('FAIL'));

        const spec = {
            id: 'fail-wf',
            steps: [{ id: 'step1', primary: 'primary', payload: {} }]
        };

        const id = await engine.submitWorkflow(spec);
        await new Promise(r => setTimeout(r, 100));

        const status = await engine.getStatus(id);
        expect(status?.status).toBe('FAILED');
    });

    test('should fail immediately on AUTH_ERROR', async () => {
        // Mock adapter that simulates Auth Error
        class AuthFailAdapter implements CloudAdapter {
            async executeStep() {
                return {
                    success: false,
                    errorCode: '401',
                    errorType: 'AUTH_ERROR' as const
                };
            }
            async getStatus() { return { status: 'FAILED' as const }; }
            async cancel() { return true; }
            async health() { return { ok: false }; }
        }

        engine.registerAdapter('auth-fail-provider', new AuthFailAdapter());

        const spec = {
            id: 'auth-fail-wf',
            steps: [{ id: 'step1', primary: 'auth-fail-provider', fallbacks: ['secondary'], payload: {} }]
        };

        const id = await engine.submitWorkflow(spec);
        await new Promise(r => setTimeout(r, 500));

        const status = await engine.getStatus(id);
        if (status?.status !== 'FAILED') {
            console.log('UNEXPECTED STATUS:', JSON.stringify(status, null, 2));
        }
        expect(status?.status).toBe('FAILED');
        expect(status?.providerHistory).toHaveLength(1);
        expect(status?.providerHistory[0].provider).toBe('auth-fail-provider');
    });

    test('idempotency: should return existing workflow ID', async () => {
        const spec = {
            id: 'idem-wf',
            steps: []
        };
        const key = 'uniq-key-123';

        const id1 = await engine.submitWorkflow(spec, key);
        const id2 = await engine.submitWorkflow(spec, key);

        expect(id1).toBe(id2);
    });
});
