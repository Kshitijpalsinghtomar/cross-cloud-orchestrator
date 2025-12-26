# 🧪 Cross-Cloud Examples

This directory contains standalone scripts to demonstrate the capabilities of the Orchestrator without needing to run the full Docker stack.

## Running Examples

You can run these examples directly using `npm` from the root directory:

```bash
# Run the basic demo
npm run example:basic

# Run the advanced failover simulation
npm run example:failover
```

## Available Examples

### 1. [basic.ts](./basic.ts)
A minimal "Hello World" showing how to instantiate the engine and run a single-step workflow.

### 2. [advanced-failover.ts](./advanced-failover.ts)
A more complex scenario that defines fallback providers and simulates how a Payment Processing flow would be architected to survive an AWS outage.
