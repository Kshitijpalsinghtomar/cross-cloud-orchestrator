"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngine = void 0;
class WorkflowEngine {
    stateStore;
    adapters;
    constructor(stateStore, adapters) {
        this.stateStore = stateStore;
        this.adapters = adapters;
    }
    async startWorkflow(def, input) {
        const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const execution = {
            executionId,
            workflowId: def.id,
            status: 'PENDING',
            currentStepId: def.startAt,
            context: input,
            history: [],
            startedAt: new Date(),
            updatedAt: new Date()
        };
        await this.stateStore.createExecution(execution, def);
        await this.stateStore.addHistoryEvent(executionId, {
            timestamp: new Date(),
            type: 'WORKFLOW_STARTED',
            details: input
        });
        // Start execution asynchronously
        this.runWorkflow(executionId, def).catch(err => console.error("Workflow run failed", err));
        return executionId;
    }
    async runWorkflow(executionId, def) {
        const execution = await this.stateStore.getExecution(executionId);
        if (!execution || execution.status === 'COMPLETED' || execution.status === 'FAILED')
            return;
        if (execution.status === 'PENDING') {
            execution.status = 'RUNNING';
            await this.stateStore.updateExecution(execution);
        }
        try {
            while (execution.currentStepId) {
                const step = def.steps.find(s => s.id === execution.currentStepId);
                if (!step) {
                    throw new Error(`Step ${execution.currentStepId} not found`);
                }
                await this.stateStore.addHistoryEvent(executionId, {
                    timestamp: new Date(),
                    type: 'STEP_STARTED',
                    stepId: step.id
                });
                const result = await this.executeStep(execution, step);
                // Update context with result
                execution.context = { ...execution.context, ...result };
                await this.stateStore.addHistoryEvent(executionId, {
                    timestamp: new Date(),
                    type: 'STEP_COMPLETED',
                    stepId: step.id,
                    details: result
                });
                // Determine next step
                execution.currentStepId = this.getNextStepId(step, result);
                await this.stateStore.updateExecution(execution);
            }
            execution.status = 'COMPLETED';
            execution.finishedAt = new Date();
            await this.stateStore.updateExecution(execution);
            await this.stateStore.addHistoryEvent(executionId, {
                timestamp: new Date(),
                type: 'WORKFLOW_COMPLETED',
                details: execution.context
            });
        }
        catch (error) {
            execution.status = 'FAILED';
            await this.stateStore.updateExecution(execution);
            await this.stateStore.addHistoryEvent(executionId, {
                timestamp: new Date(),
                type: 'WORKFLOW_COMPLETED', // Or FAILED
                details: { error: error.message }
            });
        }
    }
    async executeStep(execution, step) {
        if (step.type === 'TASK') {
            return this.executeTaskStep(step, execution.context);
        }
        else if (step.type === 'CHOICE') {
            return {}; // Basic pass-through, next step logic handles the branching
        }
        else if (step.type === 'PARALLEL') {
            // TODO: Implement parallel
            return {};
        }
        return {};
    }
    async executeTaskStep(step, context) {
        const adapter = this.adapters.get(step.provider);
        if (!adapter) {
            throw new Error(`Provider ${step.provider} not not configured`);
        }
        let result = await adapter.invoke(step.functionId, context);
        if (!result.success && step.fallbackProvider) {
            console.warn(`Primary provider ${step.provider} failed. Switching to ${step.fallbackProvider}`);
            const fallbackAdapter = this.adapters.get(step.fallbackProvider);
            if (fallbackAdapter) {
                result = await fallbackAdapter.invoke(step.functionId, context);
            }
        }
        if (!result.success) {
            throw new Error(result.error || 'Task failed');
        }
        return result.data;
    }
    getNextStepId(step, result) {
        if (step.type === 'CHOICE') {
            const choiceStep = step;
            for (const choice of choiceStep.choices) {
                if (this.evaluateCondition(choice, result)) {
                    return choice.next;
                }
            }
            return choiceStep.default;
        }
        return step.next;
    }
    evaluateCondition(choice, context) {
        const val = context[choice.variable]; // simplified
        switch (choice.operator) {
            case 'eq': return val === choice.value;
            case 'gt': return val > choice.value;
            case 'lt': return val < choice.value;
            case 'contains': return val && val.includes(choice.value);
            default: return false;
        }
    }
}
exports.WorkflowEngine = WorkflowEngine;
//# sourceMappingURL=workflow-engine.js.map