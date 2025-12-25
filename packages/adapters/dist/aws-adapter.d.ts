import { CloudFunctionAdapter, InvokeOptions, InvokeResult } from '@cc-orch/core';
export declare class AwsAdapter implements CloudFunctionAdapter {
    providerName: string;
    private client;
    constructor(region: string, credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
    });
    invoke(functionId: string, payload: any, options?: InvokeOptions): Promise<InvokeResult>;
    checkHealth(): Promise<boolean>;
}
