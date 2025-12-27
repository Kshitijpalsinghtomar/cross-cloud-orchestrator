import { WorkflowEngine, SqliteStateStore } from './src/index';
import { CloudAdapter } from './src/adapter.interface';

// Mock Adapter that hangs
class SlowAdapter implements CloudAdapter {
    async executeStep(stepId: string) {
        console.log(`[Child] Executing ${stepId}...`);
        await new Promise(r => setTimeout(r, 5000)); // Hangs so we can kill it
        return { success: true };
    }
    async getStatus() { return { status: 'RUNNING' as const }; }
    async cancel() { return true; }
    async health() { return { ok: true }; }
}

async function run() {
    const store = new SqliteStateStore('./chaos-test.db');
    const engine = new WorkflowEngine(store);
    engine.registerAdapter('slow-provider', new SlowAdapter());

    const id = await engine.submitWorkflow({
        id: 'chaos-workflow',
        steps: [{ id: 'step1', primary: 'slow-provider', payload: {} }]
    });

    console.log(`WORKFLOW_ID:${id}`);

    // Keep alive until killed
    setInterval(() => { }, 1000);
}

run();
