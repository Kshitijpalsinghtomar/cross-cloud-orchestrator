export interface InvokeOptions {
    timeout?: number;
}

export interface InvokeResult {
    success: boolean;
    data?: any;
    error?: string;
    executionTime?: number;
    providerRequestId?: string;
}

export interface CloudFunctionAdapter {
    providerName: string;

    /**
     * Invokes a serverless function.
     * @param functionId The identifier for the function (ARN, URL, or Name)
     * @param payload The input data
     */
    invoke(functionId: string, payload: any, options?: InvokeOptions): Promise<InvokeResult>;

    /**
     * Basic connectivity check to the cloud provider's region/service.
     */
    checkHealth(): Promise<boolean>;
}
