"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const core_1 = require("@cc-orch/core");
const adapters_1 = require("@cc-orch/adapters");
const prisma_store_1 = require("./store/prisma-store");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// --- Setup Orchestrator ---
const stateStore = new prisma_store_1.PrismaStateStore();
const adapters = new Map();
// Register Mocks for demo purposes
const awsMock = new adapters_1.MockAdapter();
awsMock.providerName = 'AWS'; // Hack to set correct name
awsMock.registerFunction('my-func', (input) => ({ msg: "Hello from AWS", input }));
// Simulate AWS failure for specific function ID
awsMock.registerFunction('flakey-func', () => { throw new Error("AWS Down"); });
const gcpMock = new adapters_1.MockAdapter();
gcpMock.providerName = 'GCP';
gcpMock.registerFunction('flakey-func', (input) => ({ msg: "Saved by GCP", input }));
adapters.set('AWS', awsMock);
adapters.set('GCP', gcpMock);
const engine = new core_1.WorkflowEngine(stateStore, adapters);
// --- Routes ---
// 1. Submit/Start Workflow
app.post('/executions', async (req, res) => {
    try {
        const { workflow, input } = req.body;
        if (!workflow || !workflow.id || !workflow.steps) {
            res.status(400).json({ error: "Invalid workflow definition" });
            return;
        }
        const executionId = await engine.startWorkflow(workflow, input || {});
        res.status(201).json({ executionId, status: "PENDING" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 2. List Executions
app.get('/executions', async (req, res) => {
    try {
        const executions = await stateStore.listExecutions();
        res.json(executions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 3. Get Execution Status
app.get('/executions/:id', async (req, res) => {
    try {
        const execution = await stateStore.getExecution(req.params.id);
        if (!execution) {
            res.status(404).json({ error: "Execution not found" });
            return;
        }
        res.json(execution);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 3. Health Check
app.get('/health', async (req, res) => {
    const providerChecks = await Promise.all(Array.from(adapters.values()).map(async (adapter) => {
        const health = await adapter.checkHealth();
        return {
            provider: adapter.providerName,
            ...health
        };
    }));
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
//# sourceMappingURL=server.js.map