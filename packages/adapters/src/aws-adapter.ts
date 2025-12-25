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

    async checkHealth(): Promise<import('@cc-orch/core').HealthCheckDetail> {
        try {
            const start = Date.now();
            // ListFunctions is a lightweight call to verify credentials and connectivity
            const { ListFunctionsCommand } = await import("@aws-sdk/client-lambda");
            const command = new ListFunctionsCommand({ MaxItems: 1 });
            await this.client.send(command);
            const latency = Date.now() - start;

            return {
                status: 'Online',
                latencyMs: latency,
                region: await this.client.config.region(),
                lastChecked: new Date()
            };
        } catch (err: any) {
            return {
                status: 'Offline',
                latencyMs: 0,
                region: await this.client.config.region(),
                lastChecked: new Date(),
                error: err.message
            };
        }
    }
}
