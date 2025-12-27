import axios from 'axios';
import { WorkflowSpec } from '@cc-orch/core';

async function testApi() {
    const API_URL = 'http://localhost:3000';

    // 1. Define Workflow
    const workflow: WorkflowSpec = {
        id: 'api-test-workflow',
        steps: [
            {
                id: 'step-1',
                payload: { input: "test" }, // payload is required
                primary: 'AWS'
            }
        ]
    };

    console.log("Submitting workflow...");
    try {
        const startRes = await axios.post(`${API_URL}/executions`, {
            workflow,
            input: { test: "data" }
        });
        console.log("Start Response:", startRes.data);

        const { executionId } = startRes.data;

        // 2. Poll Status
        const checkStatus = setInterval(async () => {
            const statusRes = await axios.get(`${API_URL}/executions/${executionId}`);
            const status = statusRes.data.status;
            console.log(`Execution Status: ${status}`);

            if (status === 'COMPLETED' || status === 'FAILED') {
                clearInterval(checkStatus);
                console.log("Final Result:", JSON.stringify(statusRes.data.context, null, 2));
            }
        }, 500);

    } catch (err: any) {
        console.error("API Test Failed:", err.message);
        if (err.response) console.error("Response:", err.response.data);
    }
}

testApi();
