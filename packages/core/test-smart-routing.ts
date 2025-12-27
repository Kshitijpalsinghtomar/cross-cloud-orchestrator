import { WorkflowEngine } from './src/engine';
import { CloudAdapter } from './src/adapter.interface';
import { PolicyEngine } from './src/policy.engine';

class MockAdapter implements CloudAdapter {
    constructor(
        public name: string,
        public cost: number,
        public region: string
    ) { }

    async executeStep(stepId: string, payload: any) {
        return { success: true, output: `Executed on ${this.name}`, id: 'exec-1' };
    }
    async getStatus(execId: string) { return { status: 'SUCCEEDED' as const }; }
    async cancel(execId: string) { return true; }
    async health() { return { ok: true }; }

    get providerInfo() {
        return {
            region: this.region,
            tier: 'STANDARD' as const,
            costPerMs: this.cost
        };
    }
}

async function testSmartRouting() {
    console.log('--- Starting Smart Routing Test ---');

    const policyEngine = new PolicyEngine();
    // No global policies for this test, just routing strategy

    const engine = new WorkflowEngine(undefined, policyEngine);

    // Register Adapters
    const aws = new MockAdapter('AWS', 10, 'us-east-1');
    const gcp = new MockAdapter('GCP', 5, 'us-central1'); // Cheaper

    engine.registerAdapter('AWS', aws);
    engine.registerAdapter('GCP', gcp);

    console.log('Registered AWS (Cost: 10) and GCP (Cost: 5)');

    // Submit Workflow with LOWEST_COST strategy
    const wfId = await engine.submitWorkflow({
        id: 'smart-test',
        steps: [{
            id: 'step1',
            payload: {},
            strategy: { type: 'LOWEST_COST' }
        }]
    });

    console.log(`Submitted workflow ${wfId}. Waiting for completion...`);

    // Poll for status
    let wf;
    for (let i = 0; i < 10; i++) {
        wf = await engine.getStatus(wfId);
        if (wf?.status === 'COMPLETED' || wf?.status === 'FAILED') break;
        await new Promise(r => setTimeout(r, 500));
    }

    if (wf?.status === 'COMPLETED') {
        const history = wf.providerHistory[0];
        console.log(`Workflow Completed using provider: ${history.provider}`);

        if (history.provider === 'GCP') {
            console.log('SUCCESS: Smart routing chose the cheaper provider (GCP).');
        } else {
            console.error('FAILURE: Smart routing chose the wrong provider.');
            process.exit(1);
        }
    } else {
        console.error('FAILURE: Workflow did not complete in time.');
        process.exit(1);
    }
}

testSmartRouting().catch(e => {
    console.error(e);
    process.exit(1);
});
