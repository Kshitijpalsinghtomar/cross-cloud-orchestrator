import { WorkflowEngine, InMemoryStateStore, CloudFunctionAdapter, InvokeResult, HealthCheckDetail } from '../packages/core/src';

// ------------------------------------------------------------------
// 🛠️ MOCK ADAPTERS
// ------------------------------------------------------------------
class MockAdapter implements CloudFunctionAdapter {
    constructor(
        public providerName: string,
        private shouldFail: boolean = false
    ) { }

    async invoke(functionId: string, payload: any): Promise<InvokeResult> {
        if (this.shouldFail) {
            return {
                success: false,
                error: `Simulated timeout from ${this.providerName}`
            };
        }
        return {
            success: true,
            data: { message: `Executed on ${this.providerName}`, functionId }
        };
    }

    async checkHealth(): Promise<HealthCheckDetail> {
        return {
            status: this.shouldFail ? 'Offline' : 'Online',
            latencyMs: 10,
            region: 'us-east-1',
            lastChecked: new Date()
        };
    }
}

// ------------------------------------------------------------------
// 🚀 Advanced Failover Demo
// ------------------------------------------------------------------
async function main() {
    console.clear();
    console.log("🌩️  Initializing Cross-Cloud Orchestrator...");
    console.log("-------------------------------------------------");

    // 1. Setup Engine Dependencies
    const store = new InMemoryStateStore();
    const adapters = new Map<string, CloudFunctionAdapter>();

    // 💥 CONFIGURATION: Simulate AWS Failure
    adapters.set('AWS', new MockAdapter('AWS', true));  // <--- FAILS
    adapters.set('GCP', new MockAdapter('GCP', false)); // <--- SUCCEEDS
    adapters.set('Azure', new MockAdapter('Azure', false));

    const engine = new WorkflowEngine(store, adapters);

    // 2. Define Workflow
    const workflow = {
        id: "payment-processing-flow",
        startAt: "step-1-charge-card",
        steps: [
            {
                id: "step-1-charge-card",
                type: "TASK",
                provider: "AWS",      // ❌ PRIMARY: AWS (Simulated Down)
                fallbackProvider: "GCP", // ✅ BACKUP: GCP
                functionId: "charge-card",
                next: "step-2-send-email"
            },
            {
                id: "step-2-send-email",
                type: "TASK",
                provider: "AWS",      // Note: In this demo, we use AWS for step 2 too, 
                // but since it fails, you'd see it fail here if we didn't have fallback.
                // Let's assume for step 2 we try Azure as backup.
                fallbackProvider: "Azure",
                functionId: "send-email"
            }
        ]
    };

    console.log(`\n📋 Workflow Loaded: [${workflow.id}]`);
    console.log(`   🔸 Step 1: Charge Card (Primary: AWS (DOWN), Backup: GCP)`);
    console.log(`   🔸 Step 2: Send Email  (Primary: AWS (DOWN), Backup: Azure)`);
    console.log("\n💥 SIMULATING OUTAGE: AWS US-EAST-1 IS DOWN!");
    console.log("-------------------------------------------------\n");

    // 3. Start Execution
    // Note: The engine types might need 'any' casting if strictly typed validation complicates this script
    const executionId = await engine.startWorkflow(workflow as any, { amount: 100 });
    console.log(`🚀 Execution Started: ${executionId}`);

    // 4. Poll for completion
    let status = 'RUNNING';
    while (status === 'RUNNING' || status === 'PENDING') {
        await new Promise(r => setTimeout(r, 500));
        const exec = await store.getExecution(executionId);
        if (exec) {
            status = exec.status;
            process.stdout.write('.');
        }
    }
    console.log("\n");

    // 5. Print Results
    const finalExec = await store.getExecution(executionId);
    console.log("-------------------------------------------------");
    console.log(`🏁 Final Status: ${finalExec?.status}`);
    console.log("-------------------------------------------------");

    // Check history to prove failover
    console.log("📜 Event History:");
    finalExec?.history.forEach((h: any) => {
        if (h.type === 'STEP_COMPLETED') {
            const result = h.details;
            if (result.success) {
                console.log(`   ✅ Step [${h.stepId}] Completed. Data:`, result.data);
            } else {
                console.log(`   ❌ Step [${h.stepId}] Failed.`);
            }
        }
    });

    console.log("\n(Note: Check the internal logs to see the failover logic warning messages)");
}

main().catch(console.error);
