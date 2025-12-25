import { CloudFunctionAdapter, InvokeOptions, InvokeResult } from '@cc-orch/core';
export declare class MockAdapter implements CloudFunctionAdapter {
    providerName: string;
    private functions;
    registerFunction(id: string, handler: (payload: any) => any): void;
    invoke(functionId: string, payload: any, options?: InvokeOptions): Promise<InvokeResult>;
    checkHealth(): Promise<import('@cc-orch/core').HealthCheckDetail>;
}
