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
        // Simple check: List functions or GetAccountSettings
        // For now, just assume true if client is init
        return true;
    }
}
exports.AwsAdapter = AwsAdapter;
//# sourceMappingURL=aws-adapter.js.map