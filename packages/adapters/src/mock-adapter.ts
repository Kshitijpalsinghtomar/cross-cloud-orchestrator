import { CloudFunctionAdapter, InvokeOptions, InvokeResult } from '@cc-orch/core';

export class MockAdapter implements CloudFunctionAdapter {
    providerName = 'MOCK';

    private functions: Map<string, (payload: any) => any> = new Map();
    private isDown: boolean = false;

    registerFunction(id: string, handler: (payload: any) => any) {
        this.functions.set(id, handler);
    }

    setOutage(isDown: boolean) {
        this.isDown = isDown;
        console.log(`[MockAdapter:${this.providerName}] Chaos Mode: ${isDown ? 'OUTAGE ACTIVE' : 'Operational'}`);
    }

    async invoke(functionId: string, payload: any, options?: InvokeOptions): Promise<InvokeResult> {
        if (this.isDown) {
            return {
                success: false,
                error: `[Chaos Mode] ${this.providerName} is experiencing a simulated outage.`,
                executionTime: 0
            };
        }

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

    async checkHealth(): Promise<import('@cc-orch/core').HealthCheckDetail> {
        if (this.isDown) {
            return {
                status: 'Offline',
                latencyMs: 5000,
                region: 'local-mock',
                lastChecked: new Date(),
                error: 'Simulated Outage'
            };
        }

        // Simulate random latency between 20ms and 150ms
        const latency = Math.floor(Math.random() * 130) + 20;

        // 5% chance of being "Degraded" for realism
        const isDegraded = Math.random() < 0.05;

        return {
            status: isDegraded ? 'Degraded' : 'Online',
            latencyMs: latency,
            region: 'local-mock',
            lastChecked: new Date()
        };
    }
}
