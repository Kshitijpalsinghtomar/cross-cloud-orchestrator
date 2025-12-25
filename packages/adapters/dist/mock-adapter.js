"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAdapter = void 0;
class MockAdapter {
    providerName = 'MOCK';
    functions = new Map();
    registerFunction(id, handler) {
        this.functions.set(id, handler);
    }
    async invoke(functionId, payload, options) {
        const start = Date.now();
        const handler = this.functions.get(functionId);
        if (!handler) {
            return {
                success: false,
                error: `Function ${functionId} not found in Mock Adapter`,
                executionTime: Date.now() - start
            };
        }
        try {
            const result = await Promise.resolve(handler(payload));
            return {
                success: true,
                data: result,
                executionTime: Date.now() - start
            };
        }
        catch (err) {
            return {
                success: false,
                error: err.message,
                executionTime: Date.now() - start
            };
        }
    }
    async checkHealth() {
        return true;
    }
}
exports.MockAdapter = MockAdapter;
//# sourceMappingURL=mock-adapter.js.map