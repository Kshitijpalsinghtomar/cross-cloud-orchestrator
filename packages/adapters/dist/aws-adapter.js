"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsAdapter = void 0;
const client_lambda_1 = require("@aws-sdk/client-lambda");
const util_1 = require("util");
class AwsAdapter {
    providerName = 'AWS';
    client;
    constructor(region, credentials) {
        this.client = new client_lambda_1.LambdaClient({ region, credentials });
    }
    async invoke(functionId, payload, options) {
        const start = Date.now();
        try {
            const command = new client_lambda_1.InvokeCommand({
                FunctionName: functionId,
                Payload: new util_1.TextEncoder().encode(JSON.stringify(payload)),
            });
            const response = await this.client.send(command);
            let data = null;
            if (response.Payload) {
                const text = new util_1.TextDecoder().decode(response.Payload);
                try {
                    data = JSON.parse(text);
                }
                catch {
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
        }
        catch (err) {
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
exports.AwsAdapter = AwsAdapter;
//# sourceMappingURL=aws-adapter.js.map