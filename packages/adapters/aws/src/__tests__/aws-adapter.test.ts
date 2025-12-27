import { AwsLambdaAdapter } from '../index';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { mockClient } from 'aws-sdk-client-mock';

const lambdaMock = mockClient(LambdaClient);

describe('AwsLambdaAdapter', () => {
    let adapter: AwsLambdaAdapter;

    beforeEach(() => {
        lambdaMock.reset();
        adapter = new AwsLambdaAdapter('us-east-1');
    });

    test('should execute successfully', async () => {
        lambdaMock.on(InvokeCommand).resolves({
            StatusCode: 200,
            Payload: Buffer.from(JSON.stringify({ result: 'ok' })),
            $metadata: { requestId: 'req-123' }
        });

        const result = await adapter.executeStep('step1', { functionName: 'my-func', input: { foo: 'bar' } });

        expect(result.success).toBe(true);
        expect(result.output).toEqual({ result: 'ok' });
        expect(result.id).toBe('req-123');
    });

    test('should handle FunctionError (Code Error)', async () => {
        lambdaMock.on(InvokeCommand).resolves({
            StatusCode: 200,
            FunctionError: 'Unhandled',
            Payload: Buffer.from(JSON.stringify({ errorMessage: 'Something went wrong' }))
        });

        const result = await adapter.executeStep('step1', { functionName: 'my-func' });

        expect(result.success).toBe(false);
        expect(result.errorType).toBe('NON_RETRYABLE'); // Application error
        expect(result.errorCode).toBe('FUNCTION_ERROR');
    });

    test('should handle ThrottlingException as RETRYABLE', async () => {
        const error = new Error('Rate Exceeded');
        (error as any).name = 'ThrottlingException';
        lambdaMock.on(InvokeCommand).rejects(error);

        const result = await adapter.executeStep('step1', { functionName: 'my-func' });

        expect(result.success).toBe(false);
        expect(result.errorType).toBe('RETRYABLE');
    });

    test('should handle AccessDeniedException as AUTH_ERROR', async () => {
        const error = new Error('Access Denied');
        (error as any).name = 'AccessDeniedException';
        lambdaMock.on(InvokeCommand).rejects(error);

        const result = await adapter.executeStep('step1', { functionName: 'my-func' });

        expect(result.success).toBe(false);
        expect(result.errorType).toBe('AUTH_ERROR');
    });

    test('should handle Network Error as PROVIDER_DOWN', async () => {
        const error = new Error('connect ECONNREFUSED 127.0.0.1:443');
        lambdaMock.on(InvokeCommand).rejects(error);

        const result = await adapter.executeStep('step1', { functionName: 'my-func' });

        expect(result.success).toBe(false);
        expect(result.errorType).toBe('PROVIDER_DOWN');
    });
});
