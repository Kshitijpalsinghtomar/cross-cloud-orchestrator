import { WorkflowEngine } from './dist/index';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import * as path from 'path';

// --- Adapter Shim because we don't have a real HTTP adapter yet ---
// In a real app, this would be in packages/adapters/http
class HttpAdapter {
    constructor(private url: string) { }
    async executeStep(stepId: string, payload: any) {
        try {
            const res = await fetch(`${this.url}/execute`, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) return { success: false, errorCode: res.statusText };
            const data: any = await res.json();
            return { success: true, id: data.id };
        } catch (e: any) {
            return { success: false, errorCode: e.message };
        }
    }
    async getStatus(execId: string) {
        try {
            const res = await fetch(`${this.url}/status/${execId}`);
            if (!res.ok) return { status: 'FAILED' as const };
            const data: any = await res.json();
            return { status: data.status };
        } catch (e) {
            return { status: 'FAILED' as const };
        }
    }
    async cancel(execId: string) { return true; }
    async health() { return { ok: true }; }
}

async function runTest() {
    console.log('--- STARTING FAILOVER TEST ---');

    console.log('1. Starting Mock Providers...');
    const aws = spawn('npm', ['start'], { cwd: path.resolve('../../examples/providers/aws-mock'), shell: true, stdio: 'inherit' });
    const gcp = spawn('npm', ['start'], { cwd: path.resolve('../../examples/providers/gcp-mock'), shell: true, stdio: 'inherit' });

    // Allow mocks to start
    await new Promise(r => setTimeout(r, 3000));

    console.log('2. Configuring AWS to FAIL...');
    await fetch('http://localhost:4001/configure', {
        method: 'POST',
        body: JSON.stringify({ fail: true }),
        headers: { 'Content-Type': 'application/json' }
    });

    console.log('3. Initializing Engine...');
    const engine = new WorkflowEngine();
    engine.registerAdapter('aws-lambda-payment', new HttpAdapter('http://localhost:4001'));
    engine.registerAdapter('gcp-function-payment', new HttpAdapter('http://localhost:4002'));

    const spec = {
        id: 'failover-test-v1',
        steps: [{
            id: 'process-payment',
            primary: 'aws-lambda-payment',
            fallbacks: ['gcp-function-payment'],
            payload: { amount: 100 }
        }]
    };

    console.log('4. Submitting Workflow...');
    const wfId = await engine.submitWorkflow(spec);
    console.log(`   Workflow ID: ${wfId}`);

    console.log('5. Polling for completion...');
    for (let i = 0; i < 20; i++) {
        const wf = await engine.getStatus(wfId);
        if (!wf) continue;
        console.log(`   Status: ${wf.status}, Step: ${wf.currentStep}`);

        if (wf.status === 'COMPLETED') {
            console.log('   Workflow COMPLETED!');

            // Verify History
            const awsEntry = wf.providerHistory.find(h => h.provider === 'aws-lambda-payment');
            const gcpEntry = wf.providerHistory.find(h => h.provider === 'gcp-function-payment');

            if (awsEntry && !awsEntry.success && gcpEntry && gcpEntry.success) {
                console.log('SUCCESS: Verified failover from AWS -> GCP');
                process.exit(0);
            } else {
                console.error('FAILURE: History does not show correct failover path');
                console.log(JSON.stringify(wf.providerHistory, null, 2));
                process.exit(1);
            }
        }
        if (wf.status === 'FAILED') {
            console.error('FAILURE: Workflow failed completely');
            process.exit(1);
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    console.error('TIMEOUT');
    process.exit(1);
}

runTest();
