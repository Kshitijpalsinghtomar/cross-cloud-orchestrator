import { WorkflowEngine, InMemoryStateStore } from '../packages/core';
import { MockAdapter } from '../packages/adapters';

// This example demonstrates how to use the Core Engine as a library
// without needing the full Dashboard/API stack.

async function main() {
    console.log("🚀 Starting Cross-Cloud Workflow Engine (SDK Mode)");

    // Initialize dependencies
    const store = new InMemoryStateStore();
    const adapters = new Map();
    adapters.set('AWS', new MockAdapter());
    adapters.set('GCP', new MockAdapter());

    const engine = new WorkflowEngine(store, adapters);

    // Define a simple workflow
    const workflow = {
        id: "demo-sdk-1",
        name: "Demo Workflow",
        startAt: "step-1",
        steps: [
            {
                id: "step-1",
                type: "TASK",
                task: "process-data",
                provider: "AWS", // Try AWS first
                fallbackProvider: "GCP",  // Fallback to Google
                functionId: "process-fn",
                next: undefined
            }
        ]
    };

    console.log(`\n📋 Executing Workflow: ${workflow.id}`);
    const executionId = await engine.startWorkflow(workflow as any, { input: "test-data" });
    console.log(`> Started Execution ID: ${executionId}`);

    // Wait for result (simulated)
    await new Promise(r => setTimeout(r, 1000));
    const result = await store.getExecution(executionId);

    console.log("\n✅ Execution Complete:");
    console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
