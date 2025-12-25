"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function testApi() {
    const API_URL = 'http://localhost:3000';
    // 1. Define Workflow
    const workflow = {
        id: 'api-test-workflow',
        name: 'API Test',
        startAt: 'step-1',
        steps: [
            {
                id: 'step-1',
                type: 'TASK',
                functionId: 'my-func', // Defined in server.ts
                provider: 'AWS'
            }
        ]
    };
    console.log("Submitting workflow...");
    try {
        const startRes = await axios_1.default.post(`${API_URL}/executions`, {
            workflow,
            input: { test: "data" }
        });
        console.log("Start Response:", startRes.data);
        const { executionId } = startRes.data;
        // 2. Poll Status
        const checkStatus = setInterval(async () => {
            const statusRes = await axios_1.default.get(`${API_URL}/executions/${executionId}`);
            const status = statusRes.data.status;
            console.log(`Execution Status: ${status}`);
            if (status === 'COMPLETED' || status === 'FAILED') {
                clearInterval(checkStatus);
                console.log("Final Result:", JSON.stringify(statusRes.data.context, null, 2));
            }
        }, 500);
    }
    catch (err) {
        console.error("API Test Failed:", err.message);
        if (err.response)
            console.error("Response:", err.response.data);
    }
}
testApi();
//# sourceMappingURL=test-api.js.map