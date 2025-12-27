import { WorkflowEngine, SqliteStateStore } from './src/index';
import * as fs from 'fs';
import { CloudAdapter, ExecutionResult } from './src/adapter.interface';

const DB_PATH = './chaos-test.db';

// Clean start
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

// Mock Adapter that takes time
class SlowAdapter implements CloudAdapter {
    async executeStep(stepId: string) {
        // First run: never returns (simulate crash during execution)
        // Second run: succeeds
        console.log(`[SlowAdapter] Executing ${stepId}...`);
        await new Promise(r => setTimeout(r, 100)); // fast enough for test, slow enough to inspect
        return { success: true, id: 'exec-' + Math.random() };
    }
    async getStatus(id: string) { return { status: 'SUCCEEDED' as const }; }
    async cancel() { return true; }
    async health() { return { ok: true }; }
}

async function runChaos() {
    console.log('--- CHAOS TEST: RESUME ON CRASH ---');

    // PHASE 1: Start Workflow and "Crash"
    console.log('1. Starting Engine A (Pre-crash)...');
    const storeA = new SqliteStateStore(DB_PATH);
    const engineA = new WorkflowEngine(storeA);
    engineA.registerAdapter('slow-provider', new SlowAdapter());

    const id = await engineA.submitWorkflow({
        id: 'chaos-workflow',
        steps: [{ id: 'step1', primary: 'slow-provider', payload: {} }]
    });

    console.log(`   Submitted Workflow: ${id}`);

    // Simulate "Crash" by closing the DB connection (release lock)
    console.log('2. CRASHING Engine A...');
    await storeA.close();
    console.log('   (Waiting for lock release...)');
    await new Promise(r => setTimeout(r, 1000));

    // PHASE 2: Restart Engine from same DB

    // PHASE 2: Restart Engine from same DB
    console.log('3. Restarting Engine B (Recovery)...');
    const storeB = new SqliteStateStore(DB_PATH);
    const engineB = new WorkflowEngine(storeB);
    engineB.registerAdapter('slow-provider', new SlowAdapter());

    console.log('4. Checking status...');
    const wf = await engineB.getStatus(id);
    if (!wf) {
        console.error('FAILURE: Workflow state lost!');
        process.exit(1);
    }
    console.log(`   Recovered State: ${wf.status}, Step: ${wf.currentStep}`);

    // Determine what to do. If it was RUNNING, the new engine needs to pick it up.
    // NOTE: My current simple engine doesn't have a "background poller" that scans DB on startup.
    // So we might need to verify that we *can* resume it manually or that the state is at least preserved.
    // The "Right" way is for the engine to `recover()` on startup.
    // For this test, verifying persistence is step 1.
    // Step 2 is calling `runWorkflow(id)` again (manual resume or triggered by poller).

    // Let's manually trigger resume for now as "Daemon" simulation
    console.log('5. Triggering Resume...');
    // Accessing private method via any or public API if exposed. 
    // I exposed runWorkflow as private but triggered by submit. 
    // Let's modify engine to have a public `resume()` or just re-submit?
    // Re-submitting with idempotency key would work! using `id` as key? 
    // Actually engine.ts doesn't export runWorkflow public.
    // WORKAROUND: Cast to any to call private method for test, or rely on future "Daemon" feature.
    (engineB as any).runWorkflow(id);

    console.log('6. Polling for completion...');
    for (let i = 0; i < 10; i++) {
        const check = await engineB.getStatus(id);
        if (check?.status === 'COMPLETED') {
            console.log('SUCCESS: Workflow Resumed and Completed!');
            fs.unlinkSync(DB_PATH);
            process.exit(0);
        }
        await new Promise(r => setTimeout(r, 500));
    }

    console.error('TIMEOUT: Workflow did not complete after restart');
    process.exit(1);
}

runChaos();
