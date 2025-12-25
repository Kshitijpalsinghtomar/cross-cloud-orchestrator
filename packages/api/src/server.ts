import express, { Request, Response } from 'express';
import cors from 'cors';
import {
    WorkflowEngine,
    InMemoryStateStore,
    WorkflowDefinition,
    CloudFunctionAdapter,
    MockAdapter
} from '@cc-orch/core';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- Setup Orchestrator ---
const stateStore = new InMemoryStateStore();
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

// 2. Get Execution Status
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

// 3. Health Check
app.get('/health', (req, res) => {
    res.json({ status: "OK", version: "1.0.0" });
});

app.listen(port, () => {
    console.log(`Orchestrator API running on http://localhost:${port}`);
});
