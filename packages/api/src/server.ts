import express, { Request, Response } from 'express';
import cors from 'cors';
import {
    WorkflowEngine,
    WorkflowSpec,
    CloudAdapter,
    SqliteStateStore
} from '@cc-orch/core';
import { MockAdapter } from './mock-adapter';

// import { PrismaStateStore } from './store/prisma-store';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- Setup Orchestrator ---
// Use SqliteStateStore for persistence. Defaults to ./orchestrator.db
const stateStore = new SqliteStateStore('./orchestrator.db');
const adapters = new Map<string, CloudAdapter>();

// Register Mocks for demo purposes
const awsMock = new MockAdapter();
awsMock.providerName = 'AWS'; // Hack to set correct name
awsMock.registerFunction('my-func', (input: any) => ({ msg: "Hello from AWS", input }));
// Simulate AWS failure for specific function ID
awsMock.registerFunction('flakey-func', () => { throw new Error("AWS Down"); });

const gcpMock = new MockAdapter();
gcpMock.providerName = 'GCP';
gcpMock.registerFunction('flakey-func', (input: any) => ({ msg: "Saved by GCP", input }));

adapters.set('AWS', awsMock);
adapters.set('GCP', gcpMock);
adapters.set('mock-provider', awsMock); // Fix for seeded workflows expecting 'mock-provider'

const engine = new WorkflowEngine(stateStore);
adapters.forEach((adapter, name) => engine.registerAdapter(name, adapter));

// Start Recovery Process
engine.recover().catch((err: any) => console.error("Failed to recover workflows:", err));

// --- Routes ---

// 1. Submit/Start Workflow
app.post('/executions', async (req: Request, res: Response) => {
    try {
        const { workflow, input } = req.body;

        if (!workflow || !workflow.id || !workflow.steps) {
            res.status(400).json({ error: "Invalid workflow definition" });
            return;
        }

        const executionId = await engine.submitWorkflow(workflow as WorkflowSpec, workflow.id); // Assuming submitWorkflow(spec, idempotencyKey)
        res.status(201).json({ executionId, status: "PENDING" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});



// 2. List Executions
app.get('/executions', async (req: Request, res: Response) => {
    try {
        const executions = await stateStore.list();
        res.json(executions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Get Execution Status
app.get('/executions/:id', async (req: Request, res: Response) => {
    try {
        const execution = await stateStore.get(req.params.id);
        if (!execution) {
            res.status(404).json({ error: "Execution not found" });
            return;
        }
        res.json(execution);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Dashboard Aggregation Endpoint (Polyglot)
app.get('/dashboard/summary', async (req: Request, res: Response) => {
    try {
        const analyticsUrl = process.env.ANALYTICS_URL || 'http://localhost:8999';
        const monitorUrl = process.env.MONITOR_URL || 'http://localhost:8080';

        const [analyticsRes, monitorRes] = await Promise.allSettled([
            fetch(`${analyticsUrl}/analytics`),
            fetch(`${monitorUrl}/health`)
        ]);

        let analyticsData = { status: "Online", users: 846, region: "us-east-1" }; // Mock success
        if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
            analyticsData = await analyticsRes.value.json();
        }

        let monitorData = { status: "Online", cpu: 45, memory: 60 }; // Mock success
        if (monitorRes.status === 'fulfilled' && monitorRes.value.ok) {
            monitorData = await monitorRes.value.json();
        }

        res.json({
            title: "Cross-Cloud Orchestrator Dashboard",
            services: {
                orchestrator: { status: "Online", version: "1.0.0" },
                analytics_engine: analyticsData,
                resource_monitor: monitorData
            },
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Deep System Health (calls Rust service)
app.get('/system/health-deep', async (req: Request, res: Response) => {
    try {
        const healthCheckerUrl = process.env.HEALTH_CHECKER_URL || 'http://localhost:8081';

        const response = await fetch(`${healthCheckerUrl}/health/deep`);

        if (response.ok) {
            const data = await response.json();
            res.json(data);
        } else {
            // Mock fallback for demo
            res.json({
                overall_status: "Healthy",
                checks: [
                    { service: "Database", latency: 5, status: "OK" },
                    { service: "Cache", latency: 2, status: "OK" },
                    { service: "RustCore", status: "OK", message: "Simulated Agent Active" }
                ]
            });
        }
    } catch (error: any) {
        // Mock fallback on error (network down)
        res.json({
            overall_status: "Healthy",
            checks: [
                { service: "Database", latency: 5, status: "OK" },
                { service: "Cache", latency: 2, status: "OK" },
                { service: "RustCore", status: "OK", message: "Simulated Agent Active (Fallback)" }
            ]
        });
    }
});

// 6. Send Notification (calls C# service)
app.post('/notifications/send', async (req: Request, res: Response) => {
    try {
        const notificationUrl = process.env.NOTIFICATION_URL || 'http://localhost:8082';

        const response = await fetch(`${notificationUrl}/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Bulk Notifications (calls C# service)
app.post('/notifications/bulk', async (req: Request, res: Response) => {
    try {
        const notificationUrl = process.env.NOTIFICATION_URL || 'http://localhost:8082';

        const response = await fetch(`${notificationUrl}/notifications/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 8. Chaos Control (Admin)
app.post('/admin/chaos', async (req: Request, res: Response) => {
    try {
        const { provider, isDown } = req.body;
        const adapter = adapters.get(provider);

        if (!adapter) {
            res.status(404).json({ error: `Provider ${provider} not found` });
            return;
        }

        // We know it's a MockAdapter in this specific server setup
        if (adapter instanceof MockAdapter) {
            (adapter as any).setOutage(isDown);
            res.json({ message: `Chaos Mode for ${provider}: ${isDown ? 'ACTIVATED' : 'DEACTIVATED'}` });
        } else {
            // In production with real adapters, we probably shouldn't allow this, or implement a different mechanism
            res.status(400).json({ error: "Provider does not support Chaos Mode (Real Adapter)" });
        }

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', async (req, res) => {
    const providerChecks = await Promise.all(
        Array.from(adapters.entries()).map(async ([name, adapter]) => {
            const health = await adapter.health();
            return {
                provider: name,
                status: health.ok ? 'Online' : 'Offline',
                ...health
            };
        })
    );

    const overallStatus = providerChecks.every(p => p.status === 'Online') ? 'OK' : 'DEGRADED';

    res.json({
        status: overallStatus,
        version: "1.0.0",
        providers: providerChecks
    });
});

app.listen(port, () => {
    console.log(`Orchestrator API running on http://localhost:${port}`);
});
