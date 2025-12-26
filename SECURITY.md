# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of this system seriously. If you believe you have found a security vulnerability in the Cross-Cloud Orchestrator, please report it to us as described below.

**Do not report security vulnerabilities through public GitHub issues.**

### Process

1.  Please email `kshitijpalsinghtomar@gmail.com`.
2.  Include detailed information about the vulnerability, including steps to reproduce.
3.  We will respond within 48 hours to acknowledge your report.
4.  We will investigate and provide a timeline for a fix.
5.  Once fixed, we will coordinate a disclosure timeline with you.

## Best Practices

-   **Cloud Credentials**: Never commit real AWS/GCP/Azure credentials to the repository. Use environment variables.
-   **Docker Images**: Always use pinned versions for base images to avoid supply chain attacks.
-   **Dependencies**: Regularly audit dependencies using `npm audit`.
