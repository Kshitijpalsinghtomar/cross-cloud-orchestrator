# Cross-Cloud Orchestrator Core Contract (v1)

> **STATUS: FROZEN**
> This document defines the immutable behavior of the Core Engine. Changes here require a major version bump (v2).

## 1. Workflow States
The state machine MUST adhere to this strict lifecycle. No other states exist.

- **PENDING**: Workflow submitted, persisted, but no steps executed yet.
- **RUNNING**: At least one step is in progress or processing.
- **COMPLETED**: All steps in the spec executed successfully.
- **FAILED**: A step failed on ALL providers (primary + fallbacks), or a non-recoverable error occurred.
- **CANCELLED**: User explicitly requested cancellation.

### Invariants
- A `COMPLETED`, `FAILED`, or `CANCELLED` workflow is **terminal**. It cannot transition back to `RUNNING`.
- `providerHistory` MUST be append-only.

## 2. Adapter Interface (v1)
Adapters MUST implement the following semantics:

- **Idempotency**: `executeStep` must be safe to call multiple times with the same inputs. It should return the SAME Execution ID if called twice.
- **Error Taxonomy**: Failures MUST be classified:
    - `RETRYABLE`: Engine waits and retries same provider (e.g., rate limit).
    - `NON_RETRYABLE`: Engine marks provider as failed, tries next fallback (e.g., bad request).
    - `PROVIDER_DOWN` / `TIMEOUT`: Engine tries next fallback immediately.
    - `AUTH_ERROR`: Engine FAILS the workflow immediately (security risk).

## 3. Failover Behavior
- **Sequential**: Fallbacks are tried one by one, in the order defined in `workflow.yaml`.
- **Deterministic**: The engine never randomly selects a provider.
- **Persistence**: State is saved AFTER every transition and BEFORE every external call (conceptually, or optimally).

## 4. Idempotency
- `submitWorkflow(spec, key)` MUST return the existing `workflow_id` if `key` exists.
- Re-submitting a duplicate key MUST NOT trigger new side effects.
