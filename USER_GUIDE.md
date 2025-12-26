# 📘 Cross-Cloud Orchestrator - User Guide

Welcome to the **Cross-Cloud Orchestrator**! This guide will help you understand, use, and contribute to this polyglot system.

---

## 🚀 Getting Started

### 1. What is this?
This is a "control plane" that runs your code. It's special because it doesn't rely on just one cloud. If AWS goes down, it automatically switches to Google Cloud or Azure.

### 2. Quick Run (Docker)
The easiest way to run the entire system (API, Dashboard, Analytics, Monitor) is with Docker.

```bash
# In the root directory
npm run docker:up
```

-   **Dashboard**: [http://localhost:5173](http://localhost:5173) (Login: `admin@polyglot.cloud` / `password`)
-   **API**: [http://localhost:3000](http://localhost:3000)

---

## 🎮 Using the Dashboard

1.  **Login**: Use the default credentials `admin@polyglot.cloud` / `password`.
2.  **System Health**: Click "System Health" in the sidebar to view the **Polyglot System Overview**. This shows you:
    -   Real-time status of all 5 languages (TS, Python, Go, Rust, C#).
    -   Latency of cloud providers (AWS, GCP, Azure).
3.  **Submit Workflow**: Go to "Workflows" to design and submit a new task.

---

## 🛠️ Developer Guide

### Project Structure
This is a **Monorepo**, meaning multiple projects live in one place:

| Directory | Language | Function |
|Struture|---|---|
| `packages/api` | TypeScript | The main brain (API Server) |
| `packages/dashboard` | React | The frontend UI |
| `packages/analytics-engine` | Python | Calculates stats |
| `packages/resource-monitor` | Go | Watches CPU/RAM |
| `packages/health-checker` | Rust | Deep health checks |

### How to Contribute
1.  **Pick a Language**: We support TS, Python, Go, Rust, and C#. Pick your favorite!
2.  **Check Issues**: Look for "good first issue" labels on GitHub.
3.  **Create a Branch**: `git checkout -b my-feature`
4.  **Test**: Run `npm test` before pushing.

### Running Locally (No Docker)
If you want to modify code, run services individually:

```bash
# Terminal 1: API
npm run start:api

# Terminal 2: Dashboard
cd packages/dashboard && npm run dev

# Terminal 3: Analytics
npm run start:analytics
```

---

## 🔍 SEO & Visibility
This project is optimized for discovery.
-   **DeepWiki**: [Full Documentation](https://deepwiki.com/Kshitijpalsinghtomar/cross-cloud-orchestrator)
-   **Keywords**: Serverless, Multi-Cloud, Orchestrator, Failover, Polyglot.

---

## ❓ FAQ

**Q: Do I need valid AWS keys?**
A: No! The system uses a "Mock Adapter" by default for local demos. It simulates AWS/GCP behavior.

**Q: Can I use this in production?**
A: Yes. You just need to configure `packages/adapters` with real Cloud SDK credentials.

**Q: How do I add a new language?**
A: Create a new folder in `packages/`, add a Dockerfile, and update `docker-compose.yml`. See `CONTRIBUTING.md` for details.
