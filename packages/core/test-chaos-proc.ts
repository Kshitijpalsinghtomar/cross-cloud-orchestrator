import { WorkflowEngine, SqliteStateStore } from './src/index';
import { CloudAdapter } from './src/adapter.interface';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = './chaos-test.db';

class SuccessAdapter implements CloudAdapter {
    async executeStep(stepId: string) {
        return { success: true, id: 'recovered-exec' };
    }
    async getStatus() { return { status: 'SUCCEEDED' as const }; }
    async cancel() { return true; }
    async health() { return { ok: true }; }
}

async function runChaos() {
    console.log('--- CHAOS TEST: CHILD PROCESS KILL ---');

    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

    // 1. Spawn Victim
    console.log('1. Spawning Victim (Engine A)...');
    const victim = spawn('npx', ['ts-node', 'chaos-victim.ts'], {
        shell: true,
        cwd: __dirname
    });

    let wfId = '';

    await new Promise<void>((resolve) => {
        victim.stdout.on('data', (data) => {
            const s = data.toString();
            // console.log('[Victim]', s.trim());
            if (s.includes('WORKFLOW_ID:')) {
                wfId = s.split('WORKFLOW_ID:')[1].trim();
                resolve();
            }
        });
    });

    console.log(`   Captured Workflow ID: ${wfId}`);

    // Let it run a bit
    await new Promise(r => setTimeout(r, 2000));

    // 2. Kill Victim
    console.log('2. KILLING Victim...');
    victim.kill();
    // On Windows explicit taskkill might be needed if tree doesn't die, 
    // but process.kill() usually works for spawn. 
    // Actually spawn shell: true might require tree kill. 
    // Let's try aggressive kill.
    try { process.kill(victim.pid as number); } catch (e) { }

    await new Promise(r => setTimeout(r, 1000));

    // 3. Recover
    console.log('3. Starting Engine B (Recovery)...');
    const storeB = new SqliteStateStore(DB_PATH);
    const engineB = new WorkflowEngine(storeB);
    // Register adapter that succeeds now
    engineB.registerAdapter('slow-provider', new SuccessAdapter());

    console.log('4. Verifying State...');
    const wf = await engineB.getStatus(wfId);
    console.log(`   Recovered Status: ${wf?.status} (Should be RUNNING or PENDING)`);

    if (!wf) {
        console.error('FAILURE: No state found');
        process.exit(1);
    }

    // 5. Resume
    console.log('5. Resuming...');
    // We treat re-submission as resume signal if idempotency key was used, 
    // but here we just simulate "Daemon" pickup by manually running or submitting same spec?
    // Let's cast to any to call runWorkflow directly as we rely on poller future feature.
    (engineB as any).runWorkflow(wfId);

    console.log('6. Polling for completion...');
    for (let i = 0; i < 10; i++) {
        const check = await engineB.getStatus(wfId);
        if (check?.status === 'COMPLETED') {
            console.log('SUCCESS: Workflow Resumed and Completed!');
            fs.unlinkSync(DB_PATH);
            process.exit(0);
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    console.error('TIMEOUT: Did not complete.');
    process.exit(1);
}

runChaos();
