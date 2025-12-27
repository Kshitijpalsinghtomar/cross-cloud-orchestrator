const express = require('express');
const app = express();
app.use(express.json());

app.post('/execute', (req, res) => {
    const id = 'gcp-' + Math.random().toString(36).substr(2, 9);
    console.log(`[GCP-MOCK] Started execution ${id}`);
    res.json({ id });
});

app.get('/status/:id', (req, res) => {
    res.json({ status: 'SUCCEEDED' });
});

const PORT = 4002;
app.listen(PORT, () => console.log(`GCP Mock Provider running on port ${PORT}`));
