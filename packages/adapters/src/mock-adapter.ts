import { CloudFunctionAdapter, InvokeOptions, InvokeResult } from '@cc-orch/core';

export class MockAdapter implements CloudFunctionAdapter {
    providerName = 'MOCK';

    private functions: Map<string, (payload: any) => any> = new Map();

    registerFunction(id: string, handler: (payload: any) => any) {
        this.functions.set(id, handler);
    }

    async invoke(functionId: string, payload: any, options?: InvokeOptions): Promise<InvokeResult> {
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
        } catch (err: any) {
            return {
                success: false,
                error: err.message,
                executionTime: Date.now() - start
            };
        }
    }

    async checkHealth(): Promise<boolean> {
        return true;
    }
}
