import { WorkflowEngine } from '../packages/core';

// This example demonstrates how to use the Core Engine as a library
// without needing the full Dashboard/API stack.

async function main() {
    console.log("🚀 Starting Cross-Cloud Workflow Engine (SDK Mode)");

    const engine = new WorkflowEngine();

    // Define a simple workflow
    const workflow = {
        id: "demo-sdk-1",
        steps: [
            {
                id: "step-1",
                task: "process-data",
                provider: "AWS", // Try AWS first
                fallback: "GCP"  // Fallback to Google
            }
        ]
    };

    console.log(`\n📋 Executing Workflow: ${workflow.id}`);
    const results = await engine.execute(workflow);

    console.log("\n✅ Execution Complete:");
    console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
