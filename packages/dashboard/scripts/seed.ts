import axios from 'axios';

const API = 'http://localhost:3000';

const workflows = [
    {
        description: "Simple Linear Flow",
        spec: {
            id: "linear-demo",
            steps: [
                { id: "validate", primary: "AWS", payload: { duration: 500 } },
                { id: "process", primary: "AWS", dependencies: ["validate"], payload: { duration: 1000 } },
                { id: "notify", primary: "GCP", dependencies: ["process"], payload: { duration: 500 } }
            ]
        }
    },
    {
        description: "Complex DAG (Parallel)",
        spec: {
            id: "parallel-dag-demo",
            steps: [
                { id: "start", primary: "AWS", payload: { duration: 200 } },
                { id: "branch-a", primary: "AWS", dependencies: ["start"], payload: { duration: 1500 } },
                { id: "branch-b", primary: "GCP", dependencies: ["start"], payload: { duration: 800 } },
                { id: "branch-c", primary: "AWS", dependencies: ["start"], payload: { duration: 2000 } },
                { id: "aggregate", primary: "GCP", dependencies: ["branch-a", "branch-b", "branch-c"], payload: { duration: 500 } }
            ]
        }
    },
    {
        description: "Failing Workflow",
        spec: {
            id: "failure-demo",
            steps: [
                { id: "init", primary: "AWS", payload: { duration: 200 } },
                { id: "risky-step", primary: "AWS", dependencies: ["init"], payload: { fail: true } },
                { id: "cleanup", primary: "GCP", dependencies: ["risky-step"], payload: { duration: 800 } }
            ]
        }
    }
];

async function seed() {
    console.log("Seeding data...");
    for (const wf of workflows) {
        try {
            await axios.post(`${API}/executions`, {
                workflow: wf.spec,
                input: {}
            });
            console.log(`Submitted: ${wf.description}`);
        } catch (e) {
            console.error(`Failed to submit ${wf.description}`);
        }
    }
    console.log("Done!");
}

seed();
