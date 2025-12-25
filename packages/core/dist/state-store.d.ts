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
export declare class InMemoryStateStore implements StateStore {
    private executions;
    private locks;
    createExecution(execution: WorkflowExecution): Promise<void>;
    updateExecution(execution: WorkflowExecution): Promise<void>;
    getExecution(executionId: string): Promise<WorkflowExecution | null>;
    addHistoryEvent(executionId: string, event: ExecutionEvent): Promise<void>;
    acquireLock(resourceId: string, ttlMs: number): Promise<boolean>;
    releaseLock(resourceId: string): Promise<void>;
}
