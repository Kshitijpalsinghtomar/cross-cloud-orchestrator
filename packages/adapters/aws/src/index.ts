import { CloudAdapter, ExecutionResult } from '@cross-cloud/core/dist/adapter.interface';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

export class AwsLambdaAdapter implements CloudAdapter {
    private client: LambdaClient;

    constructor(region: string = 'us-east-1') {
        this.client = new LambdaClient({ region });
    }

    async executeStep(stepId: string, payload: any): Promise<ExecutionResult> {
        try {
            // Mapping convention: payload must contain functionName
            const functionName = payload.functionName;
            if (!functionName) {
                return {
                    success: false,
                    errorCode: 'INVALID_PAYLOAD',
                    errorType: 'NON_RETRYABLE',
                    details: 'Missing payload.functionName'
                };
            }

            const command = new InvokeCommand({
                FunctionName: functionName,
                Payload: JSON.stringify(payload.input || {}) as any, // SDK types issue with Uint8Array vs string
            });

            const response = await this.client.send(command);

            if (response.FunctionError) {
                return {
                    success: false,
                    errorCode: 'FUNCTION_ERROR',
                    errorType: 'NON_RETRYABLE', // Code error usually non-retryable
                    details: response.Payload ? Buffer.from(response.Payload).toString() : 'Unknown function error'
                };
            }

            // Success
            const output = response.Payload ? JSON.parse(Buffer.from(response.Payload).toString()) : {};
            return {
                success: true,
                output,
                id: response.$metadata?.requestId
            };

        } catch (error: any) {
            return this.mapError(error);
        }
    }

    async getStatus(execId: string): Promise<any> {
        // AWS Invoke is synchronous (RequestResponse). 
        // Async invoke is Event. For V1 we assume Sync Invoke.
        return { status: 'SUCCEEDED' };
    }

    async cancel(execId: string): Promise<boolean> {
        return false; // Lambda execution cannot be cancelled easily once started if sync
    }

    async health(): Promise<{ ok: boolean }> {
        try {
            // Lightweight check? Maybe list functions or just true if client init
            return { ok: true };
        } catch (e) {
            return { ok: false };
        }
    }

    private mapError(error: any): ExecutionResult {
        const code = error.name || 'UnknownError';
        let errorType: ExecutionResult['errorType'] = 'NON_RETRYABLE';

        if (['ThrottlingException', 'TooManyRequestsException', 'ServiceException', 'EC2ThrottledException'].includes(code)) {
            errorType = 'RETRYABLE';
        } else if (['ProvisionedThroughputExceededException', 'RequestTimeout', 'TimeoutException'].includes(code)) {
            errorType = 'TIMEOUT';
        } else if (['AccessDeniedException', 'ExpiredTokenException', 'UnrecognizedClientException', 'InvalidSignatureException'].includes(code)) {
            errorType = 'AUTH_ERROR';
        } else if (['ResourceNotFoundException', 'InvalidParameterValueException'].includes(code)) {
            errorType = 'NON_RETRYABLE';
        }

        // Network errors
        if (error.message?.includes('ECONNREFUSED') || error.message?.includes('network')) {
            errorType = 'PROVIDER_DOWN';
        }

        return {
            success: false,
            errorCode: code,
            errorType,
            details: error.message
        };
    }
}
