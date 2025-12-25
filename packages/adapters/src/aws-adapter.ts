import { CloudFunctionAdapter, InvokeOptions, InvokeResult } from '@cc-orch/core';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { TextDecoder, TextEncoder } from "util";

export class AwsAdapter implements CloudFunctionAdapter {
    providerName = 'AWS';
    private client: LambdaClient;

    constructor(region: string, credentials?: { accessKeyId: string; secretAccessKey: string }) {
        this.client = new LambdaClient({ region, credentials });
    }

    async invoke(functionId: string, payload: any, options?: InvokeOptions): Promise<InvokeResult> {
        const start = Date.now();
        try {
            const command = new InvokeCommand({
                FunctionName: functionId,
                Payload: new TextEncoder().encode(JSON.stringify(payload)),
            });

            const response = await this.client.send(command);

            let data = null;
            if (response.Payload) {
                const text = new TextDecoder().decode(response.Payload);
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text;
                }
            }

            if (response.FunctionError) {
                return {
                    success: false,
                    error: response.FunctionError, // or detailed error from payload
                    data,
                    executionTime: Date.now() - start
                };
            }

            return {
                success: true,
                data,
                executionTime: Date.now() - start,
                providerRequestId: response.LogResult // or request id from metadata
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
        // Simple check: List functions or GetAccountSettings
        // For now, just assume true if client is init
        return true;
    }
}
