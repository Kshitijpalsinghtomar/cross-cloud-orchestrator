import { WorkflowExecution, ExecutionEvent } from './types';

export interface StateStore {
    createExecution(execution: WorkflowExecution): Promise<void>;
    updateExecution(execution: WorkflowExecution): Promise<void>;
    getExecution(executionId: string): Promise<WorkflowExecution | null>;
    addHistoryEvent(executionId: string, event: ExecutionEvent): Promise<void>;

    /**
     * Tries to acquire a distributed lock.
     * @param resourceId - Key to lock
     * @param ttlMs - Time to live in milliseconds
     * @returns true if lock acquired
     */
    acquireLock(resourceId: string, ttlMs: number): Promise<boolean>;
    releaseLock(resourceId: string): Promise<void>;
}

export class InMemoryStateStore implements StateStore {
    private executions = new Map<string, WorkflowExecution>();
    private locks = new Map<string, number>(); // key -> expiration timestamp

    async createExecution(execution: WorkflowExecution): Promise<void> {
        this.executions.set(execution.executionId, { ...execution });
    }

    async updateExecution(execution: WorkflowExecution): Promise<void> {
        // In a real DB, we'd patch. Here we replace.
        this.executions.set(execution.executionId, { ...execution });
    }

    async getExecution(executionId: string): Promise<WorkflowExecution | null> {
        const exec = this.executions.get(executionId);
        return exec ? { ...exec } : null;
    }

    async addHistoryEvent(executionId: string, event: ExecutionEvent): Promise<void> {
        const exec = this.executions.get(executionId);
        if (exec) {
            exec.history.push(event);
            exec.updatedAt = new Date();
        }
    }

    async acquireLock(resourceId: string, ttlMs: number): Promise<boolean> {
        const now = Date.now();
        const currentExpiry = this.locks.get(resourceId);

        if (currentExpiry && currentExpiry > now) {
            return false; // Already locked
        }

        this.locks.set(resourceId, now + ttlMs);
        return true;
    }

    async releaseLock(resourceId: string): Promise<void> {
        this.locks.delete(resourceId);
    }
}
