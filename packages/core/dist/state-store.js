"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryStateStore = void 0;
class InMemoryStateStore {
    executions = new Map();
    locks = new Map(); // key -> expiration timestamp
    async createExecution(execution, definition) {
        this.executions.set(execution.executionId, { ...execution });
    }
    async updateExecution(execution) {
        // In a real DB, we'd patch. Here we replace.
        this.executions.set(execution.executionId, { ...execution });
    }
    async getExecution(executionId) {
        const exec = this.executions.get(executionId);
        return exec ? { ...exec } : null;
    }
    async listExecutions() {
        return Array.from(this.executions.values()).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    }
    async addHistoryEvent(executionId, event) {
        const exec = this.executions.get(executionId);
        if (exec) {
            exec.history.push(event);
            exec.updatedAt = new Date();
        }
    }
    async acquireLock(resourceId, ttlMs) {
        const now = Date.now();
        const currentExpiry = this.locks.get(resourceId);
        if (currentExpiry && currentExpiry > now) {
            return false; // Already locked
        }
        this.locks.set(resourceId, now + ttlMs);
        return true;
    }
    async releaseLock(resourceId) {
        this.locks.delete(resourceId);
    }
}
exports.InMemoryStateStore = InMemoryStateStore;
//# sourceMappingURL=state-store.js.map