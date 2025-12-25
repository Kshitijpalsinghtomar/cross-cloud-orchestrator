# Contributing to Cross-Cloud Serverless Orchestrator

Thank you for your interest in contributing! We welcome all contributions to make this orchestrator more robust and versatile.

## Getting Started
1.  **Fork the repo** and clone it locally.
2.  Install dependencies: `npm install`
3.  Build the packages: `npm run build` (runs `tsc` in workspaces).

## Development Workflow
This project is a Monorepo using **npm workspaces**:
-   `packages/core`: The main logic.
-   `packages/adapters`: Cloud SDK wrappers.
-   `packages/api`: The HTTP server.

### Adding Features
1.  Create a branch: `git checkout -b feature/my-new-feature`
2.  Make changes.
3.  If modifying `core`, ensure you run `npm run build -w packages/core` to update types for other packages.
4.  Run tests (if available): `npm test`

## Pull Request Guidelines
-   Update `README.md` with details of changes to the interface.
-   Ensure your code is linted (`npm run lint` - to be configured).
-   Describe your changes clearly in the PR.

## Code of Conduct
Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.
