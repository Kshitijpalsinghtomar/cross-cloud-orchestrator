import { WorkflowEngine } from './workflow-engine';
import { InMemoryStateStore } from './state-store';
import { WorkflowDefinition, CloudProvider } from './types';
import { CloudFunctionAdapter } from './interfaces';

// Simple Mock Adapter Implementation locally for the demo
class LocalMockAdapter implements CloudFunctionAdapter {
    constructor(public providerName: string, private shouldFail: boolean = false) { }

    async invoke(functionId: string, payload: any) {
        console.log(`[${this.providerName}] Invoking ${functionId} with payload:`, JSON.stringify(payload));

        if (this.shouldFail) {
            console.log(`[${this.providerName}] Simulating FAILURE`);
            return { success: false, error: "Simulated Provider Outage" };
        }

        return {
            success: true,
            data: { processedBy: this.providerName, result: "Success" }
        };
    }

    async checkHealth() { return !this.shouldFail; }
}

async function runDemo() {
    console.log("=== Starting Cross-Cloud Orchestrator Demo ===");

    // 1. Setup Infrastructure
    const stateStore = new InMemoryStateStore();

    // 2. Setup Adapters (Simulating AWS Outage)
    const awsAdapter = new LocalMockAdapter('AWS', true); // AWS Fails
    const gcpAdapter = new LocalMockAdapter('GCP', false); // GCP Works
    const adapters = new Map<string, CloudFunctionAdapter>();
    adapters.set('AWS', awsAdapter);
    adapters.set('GCP', gcpAdapter);

    const engine = new WorkflowEngine(stateStore, adapters);

    // 3. Define Workflow with Failover
    const workflow: WorkflowDefinition = {
        id: 'wk-failover-demo',
        name: 'Failover Demo Workflow',
        startAt: 'process-step',
        steps: [
            {
                id: 'process-step',
                type: 'TASK',
                functionId: 'process-data-v1',
                provider: 'AWS',        // Try AWS first
                fallbackProvider: 'GCP' // Failover to GCP
            }
        ]
    };

    // 4. Start Execution
    console.log("\nStarting Workflow...");
    const executionId = await engine.startWorkflow(workflow, { inputData: "Hello World" });
    console.log(`Execution Started: ${executionId}`);

    // 5. Poll for completion (in real life, verify via API)
    const poll = setInterval(async () => {
        const exec = await stateStore.getExecution(executionId);
        if (exec && (exec.status === 'COMPLETED' || exec.status === 'FAILED')) {
            clearInterval(poll);
            console.log(`\nWorkflow Finished with status: ${exec.status}`);
            console.log("Final Context:", JSON.stringify(exec.context, null, 2));

            console.log("\nExecution History:");
            exec.history.forEach(h => {
                console.log(`[${h.timestamp.toISOString()}] ${h.type} ${h.stepId ? 'on ' + h.stepId : ''}`);
                if (h.details) console.log(`  Details: ${JSON.stringify(h.details)}`);
            });
        }
    }, 500);
}

runDemo();
