const express = require('express');
const app = express();
app.use(express.json());

let shouldFail = false;

app.post('/configure', (req, res) => {
    shouldFail = req.body.fail || false;
    console.log(`[AWS-MOCK] Configured to fail: ${shouldFail}`);
    res.json({ status: 'ok', shouldFail });
});

app.post('/execute', (req, res) => {
    if (shouldFail) {
        console.log('[AWS-MOCK] Failing request (503)');
        return res.status(503).json({
            error: 'Service Unavailable',
            errorType: 'PROVIDER_DOWN'
        });
    }
    const id = 'aws-' + Math.random().toString(36).substr(2, 9);
    console.log(`[AWS-MOCK] Started execution ${id}`);
    res.json({ id });
});

app.get('/status/:id', (req, res) => {
    if (shouldFail) {
        return res.status(503).json({ error: 'Service Unavailable' });
    }
    // Simulate eventual success
    res.json({ status: 'SUCCEEDED' });
});

const PORT = 4001;
app.listen(PORT, () => console.log(`AWS Mock Provider running on port ${PORT}`));
