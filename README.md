# 🌩️ Cross-Cloud Serverless Orchestrator

> **A resilient "Meta-Orchestrator" that manages workflows across AWS, GCP, and Azure with automatic failover.**

## 🤔 What is this?
Imagine you have a critical business workflow (like processing a payment) running on **AWS Lambda**. If AWS has a region outage, your business stops. 

This project is a **Control Plane** that sits *above* the clouds. It executes your workflows and acts as a "traffic controller":
1.  It tries to run a step on **AWS**.
2.  If AWS is down, it **automatically detects the failure**.
3.  It instantly redirects the task to **Google Cloud (GCP)** or **Azure** to ensure your workflow completes successfully.

## 🚀 Key Features

-   **🛡️ Automatic Failover**: Define a `fallbackProvider` for any step. If the primary cloud fails, the backup takes over seamlessly.
-   **🔌 Cloud Agnostic**: The core logic doesn't care about cloud specifics. It uses "Adapters" to talk to AWS, GCP, or Azure.
-   **🧠 Smart State Management**: Tracks the progress of every workflow (Pending → Running → Completed).
-   **🌐 REST API**: Submit and monitor workflows remotely via simple HTTP requests.

## 🏗️ Architecture (Hexagonal)

The project is built as a **TypeScript Monorepo**:

-   **`packages/core`**: The brain. Contains the orchestration engine and state machine types. It has **zero** dependencies on specific clouds.
-   **`packages/adapters`**: The hands. Contains the actual code to talk to AWS SDK, Google Cloud SDK, etc.
-   **`packages/api`**: The interface. An Express.js server that lets you talk to the engine.

## ⚡ Quick Start

### 1. Installation
```bash
# Install all dependencies
npm install

# Build all packages
npm run build -w packages/core
npm run build -w packages/adapters
npm run build -w packages/api
```

### 2. Run the Demo (CLI)
We have a built-in demo that simulates an AWS outage to prove the system works.
```bash
node packages/core/dist/demo.js
```
**What you'll see:** 
The system tries to invoke a function on "AWS". The mock adapter simulates a crash. The system catches it and successfully runs the function on "GCP" instead.

### 3. Run the API Server
Start the control plane server:
```bash
npm start --workspace=packages/api
```
The server runs on `http://localhost:3000`.

**Submit a Workflow:**
```bash
curl -X POST http://localhost:3000/executions \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "id": "my-flow",
      "startAt": "step1",
      "steps": [{ 
        "id": "step1", 
        "type": "TASK", 
        "provider": "AWS", 
        "functionId": "my-func" 
      }]
    },
    "input": { "hello": "world" }
  }'
```

---

## 📂 Project Structure

```
├── packages/
│   ├── core/       # Workflow Engine & State Logic
│   ├── adapters/   # AWS/GCP/Azure Implementations
│   └── api/        # REST API Server
├── package.json    # Root configuration
└── README.md       # This file
```

## 🔮 Future Roadmap
-   [ ] **Redis Persistence**: Replace the current in-memory store with Redis for production durability.
-   [ ] **Real Cloud Keys**: Update `aws-adapter.ts` with real IAM credentials to control actual infrastructure.
-   [ ] **Dashboard UI**: A React frontend to visualize active workflows.
