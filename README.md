# 🌩️ Cross-Cloud Serverless Orchestrator
![CI](https://github.com/Kshitijpalsinghtomar/cross-cloud-orchestrator/actions/workflows/ci.yml/badge.svg)


> **A resilient "Meta-Orchestrator" that manages workflows across AWS, GCP, and Azure with automatic failover.**

[![DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Kshitijpalsinghtomar/cross-cloud-orchestrator)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)](https://golang.org/)
[![Rust](https://img.shields.io/badge/Rust-000000?style=flat&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![C#](https://img.shields.io/badge/C%23-239120?style=flat&logo=c-sharp&logoColor=white)](https://docs.microsoft.com/en-us/dotnet/csharp/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

## 📚 Documentation
> **Explore the full documentation on [DeepWiki](https://deepwiki.com/Kshitijpalsinghtomar/cross-cloud-orchestrator)**

## 🤔 What is this?

Imagine you have a critical business workflow (like processing a payment) running on **AWS Lambda**. If AWS has a region outage, your business stops. 

This project is a **Control Plane** that sits *above* the clouds. It executes your workflows and acts as a "traffic controller":
1.  It tries to run a step on **AWS**.
2.  If AWS is down, it **automatically detects the failure**.
3.  It instantly redirects the task to **Google Cloud (GCP)** or **Azure** to ensure your workflow completes successfully.

## 🚀 Key Features

-   **🛡️ Automatic Failover**: Define a `fallbackProvider` for any step. If the primary cloud fails, the backup takes over seamlessly.
-   **⌨️  Developer CLI**: Interactive tool (`cc-orch`) to scaffold workflows and check system health with beautiful UI.
-   **🔌 Cloud Agnostic**: The core logic doesn't care about cloud specifics. It uses "Adapters" to talk to AWS, GCP, or Azure.
-   **🧠 Smart State Management**: Tracks the progress of every workflow (Pending → Running → Completed).
-   **🌐 REST API**: Submit and monitor workflows remotely via simple HTTP requests.
-   **🌍 Polyglot Architecture**: 5 languages working together (TypeScript, Python, Go, Rust, C#).

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph "Cross-Cloud Switchboard"
        API[API Server :3000] -->|Submit| Engine[Workflow Engine]
        Engine -->|Execute| AWS[AWS Adapter]
        Engine -->|Execute| GCP[GCP Adapter]
        Engine -->|Execute| Azure[Azure Adapter]
    end

    subgraph "Polyglot Services"
        Monitor[Resource Monitor (Go)] -->|Health/Metrics| API
        Analytics[Analytics Engine (Python)] -->|Stats| API
        Health[Health Checker (Rust)] -->|Deep Pings| API
        Notify[Notification Service (C#)] -->|Alerts| API
    end

    AWS -.->|Failover| GCP
    GCP -.->|Failover| Azure
```

### Services Overview

| Service | Language | Framework | Port | Description |
|---------|----------|-----------|------|-------------|
| **Orchestrator API** | TypeScript | Express.js | 3000 | Main gateway, workflow engine, routing |
| **Analytics Engine** | Python | FastAPI | 8000 | Data processing, KPIs, metrics |
| **Resource Monitor** | Go | net/http | 8080 | System health, CPU/Memory monitoring |
| **Health Checker** | Rust | Actix-web | 8081 | Deep concurrent health analysis |
| **Notification Service** | C# | .NET 8 | 8082 | Enterprise notifications (email/SMS) |

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- (Optional) Python 3.11+, Go 1.21+, for local development

### 1. Clone & Install
```bash
git clone https://github.com/Kshitijpalsinghtomar/cross-cloud-orchestrator.git
cd cross-cloud-orchestrator

# Install Node.js dependencies
npm install

# Build TypeScript
npm run build
```

### 2. Run with Docker (Recommended)
```bash
# Build all services
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### 3. Run Locally (Development)
```bash
# Terminal 1: Start API
npm run start:api

# Terminal 2: Start Python Analytics
npm run start:analytics

# Terminal 3: Start Go Monitor
npm run start:monitor
```

---

## 📡 API Endpoints

### Core Orchestration
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/executions` | Submit a new workflow |
| GET | `/executions` | List all executions |
| GET | `/executions/:id` | Get execution status |
| GET | `/health` | Basic health check |

### Polyglot Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/summary` | Aggregated data from all services |
| GET | `/system/health-deep` | Deep health analysis (Rust) |
| POST | `/notifications/send` | Send notification (C#) |
| POST | `/notifications/bulk` | Bulk notifications (C#) |

### Example: Submit Workflow
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

### Example: Send Notification
```bash
curl -X POST http://localhost:3000/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"to": "user@example.com", "message": "Hello from polyglot!"}'
```

---

## 📂 Project Structure

```
cross-cloud-orchestrator/
├── packages/
│   ├── api/              # TypeScript - Express API Server
│   ├── core/             # TypeScript - Workflow Engine & State
│   ├── adapters/         # TypeScript - AWS/GCP/Azure SDKs
│   ├── database/         # TypeScript - Prisma ORM
│   ├── dashboard/        # TypeScript - React Dashboard
│   ├── worker/           # TypeScript - Background Worker
│   ├── analytics-engine/ # Python - FastAPI Analytics
│   ├── resource-monitor/ # Go - Health Monitoring
│   ├── health-checker/   # Rust - Deep Health Analysis
│   └── notification-service/ # C# - .NET Notifications
├── docker-compose.yml    # Multi-service orchestration
├── Dockerfile            # Main API container
├── package.json          # Root configuration
└── README.md             # This file
```

---

## 🛠️ Development

### NPM Scripts
```bash
npm run build          # Build TypeScript
npm run test           # Run tests
npm run lint           # Lint code
npm run start:api      # Start Node.js API
npm run start:analytics # Start Python service
npm run start:monitor  # Start Go service
npm run docker:build   # Build Docker images
npm run docker:up      # Start Docker stack
npm run docker:down    # Stop Docker stack
npm run docker:logs    # View Docker logs
```

### Adding New Services
1. Create package in `packages/new-service/`
2. Add Dockerfile
3. Update `docker-compose.yml`
4. Add environment variables to API service
5. Create endpoint in `packages/api/src/server.ts`

---

## 🔮 Roadmap

- [x] **Multi-Cloud Failover**: AWS → GCP automatic redirect
- [x] **Polyglot Architecture**: 5 languages integrated
- [x] **Docker Orchestration**: Full stack containerization
- [ ] **Kubernetes Deployment**: Helm charts for K8s
- [ ] **OpenTelemetry**: Distributed tracing
- [ ] **Redis Persistence**: Replace in-memory store
- [ ] **Dashboard UI**: React visualization

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
