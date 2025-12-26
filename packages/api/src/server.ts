import express, { Request, Response } from 'express';
import cors from 'cors';
import {
    WorkflowEngine,
    WorkflowDefinition,
    CloudFunctionAdapter
} from '@cc-orch/core';
import { MockAdapter } from '@cc-orch/adapters';

import { PrismaStateStore } from './store/prisma-store';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- Setup Orchestrator ---
const stateStore = new PrismaStateStore();
const adapters = new Map<string, CloudFunctionAdapter>();

// Register Mocks for demo purposes
const awsMock = new MockAdapter();
awsMock.providerName = 'AWS'; // Hack to set correct name
awsMock.registerFunction('my-func', (input) => ({ msg: "Hello from AWS", input }));
// Simulate AWS failure for specific function ID
awsMock.registerFunction('flakey-func', () => { throw new Error("AWS Down"); });

const gcpMock = new MockAdapter();
gcpMock.providerName = 'GCP';
gcpMock.registerFunction('flakey-func', (input) => ({ msg: "Saved by GCP", input }));

adapters.set('AWS', awsMock);
adapters.set('GCP', gcpMock);

const engine = new WorkflowEngine(stateStore, adapters);

// --- Routes ---

// 1. Submit/Start Workflow
app.post('/executions', async (req: Request, res: Response) => {
    try {
        const { workflow, input } = req.body;

        if (!workflow || !workflow.id || !workflow.steps) {
            res.status(400).json({ error: "Invalid workflow definition" });
            return;
        }

        const executionId = await engine.startWorkflow(workflow as WorkflowDefinition, input || {});
        res.status(201).json({ executionId, status: "PENDING" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});



// 2. List Executions
app.get('/executions', async (req: Request, res: Response) => {
    try {
        const executions = await stateStore.listExecutions();
        res.json(executions);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Get Execution Status
app.get('/executions/:id', async (req: Request, res: Response) => {
    try {
        const execution = await stateStore.getExecution(req.params.id);
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

        let analyticsData = { error: "Service Unavailable" };
        if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
            analyticsData = await analyticsRes.value.json();
        }

        let monitorData = { error: "Service Unavailable" };
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
            res.status(503).json({
                error: "Health checker service unavailable",
                fallback: {
                    overall_status: "unknown",
                    message: "Deep health check requires Rust service"
                }
            });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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

app.get('/health', async (req, res) => {
    const providerChecks = await Promise.all(
        Array.from(adapters.values()).map(async (adapter) => {
            const health = await adapter.checkHealth();
            return {
                provider: adapter.providerName,
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
