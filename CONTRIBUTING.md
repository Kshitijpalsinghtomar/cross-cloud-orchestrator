# Contributing to Cross-Cloud Serverless Orchestrator

Thank you for your interest in contributing! We welcome all contributions to make this orchestrator more robust and versatile.

## 🚀 Getting Started

1.  **Fork the repo** and clone it locally.
2.  Install dependencies: `npm install`
3.  Build the packages: `npm run build`

## 🏗️ Project Structure

This project is a **Polyglot Monorepo** using 5 languages:

| Package | Language | Purpose |
|---------|----------|---------|
| `packages/api` | TypeScript | Main API Server |
| `packages/core` | TypeScript | Workflow Engine |
| `packages/adapters` | TypeScript | Cloud SDK Wrappers |
| `packages/database` | TypeScript | Prisma ORM |
| `packages/dashboard` | TypeScript | React Dashboard |
| `packages/analytics-engine` | Python | FastAPI Analytics |
| `packages/resource-monitor` | Go | Health Monitoring |
| `packages/health-checker` | Rust | Deep Health Analysis |
| `packages/notification-service` | C# | Notifications |

## 💻 Development Workflow

### TypeScript Packages
```bash
npm run build          # Build all TypeScript
npm run lint           # Lint TypeScript
npm run test           # Run tests
```

### Python (Analytics Engine)
```bash
cd packages/analytics-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 8999
```

### Go (Resource Monitor)
```bash
cd packages/resource-monitor
go run main.go
```

### Rust (Health Checker)
```bash
cd packages/health-checker
cargo build --release
cargo run
```

### C# (Notification Service)
```bash
cd packages/notification-service
dotnet run
```

### Docker (Full Stack)
```bash
npm run docker:build   # Build all containers
npm run docker:up      # Start stack
npm run docker:logs    # View logs
npm run docker:down    # Stop stack
```

## ✨ Adding New Features

### TypeScript
1.  Create a branch: `git checkout -b feature/my-feature`
2.  Make changes in the appropriate package
3.  Run `npm run build` to update types
4.  Run tests: `npm test`

### Adding a New Language/Service
1.  Create package: `packages/new-service/`
2.  Add `Dockerfile`
3.  Update `docker-compose.yml`
4.  Add environment variable to API service
5.  Create endpoint in `packages/api/src/server.ts`
6.  Update `.gitignore` with language-specific entries
7.  Update this guide!

## 📝 Pull Request Guidelines

-   Update `README.md` with details of changes
-   Ensure code is linted: `npm run lint`
-   Add tests if applicable
-   Describe your changes clearly in the PR
-   If adding a new service, include Dockerfile

## 🐳 Docker Guidelines

-   Use multi-stage builds for smaller images
-   Base images should be pinned (e.g., `node:20-slim`, `python:3.11-slim`)
-   Include health checks in `docker-compose.yml`
-   Expose only necessary ports

## 📋 Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.
