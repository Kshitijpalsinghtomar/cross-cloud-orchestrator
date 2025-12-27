# System Limits & Performance Constraints

This document outlines the known limits, performance characteristics, and bottlenecks of the Core Engine v1.

## 1. Concurrency Limits

*   **Execution Model**: Single-threaded Node.js event loop.
*   **Vertical Scaling**: Limited by single CPU core performance.
*   **Horizontal Scaling**: Not yet supported (requires shared DB locking strategy or partitioned state).
*   **Max Concurrent Workflows**:
    *   Estimated: ~50-100 active workflows/sec (IO-bound).
    *   Bottleneck: SQLite write locking and `pollUntilTerminal` loop frequency.

## 2. Latency Overhead

*   **Engine Overhead**: ~5-15ms per step transition (State serialization + DB Write).
*   **Network Overhead**: Dependent on Adapter implementation (AWS SDK initialization implies warm-up latency).
*   **Polling Interval**: Default 1000ms. Fast-completing async tasks will have average 500ms latency penalty due to polling.

## 3. Storage Constraints (SQLite)

*   **State Size**: JSON payloads stored in text column.
*   **Limit**: Practical limit ~1GB file size before performance degradation.
*   **Recommendation**:
    *   Prune completed workflows periodically.
    *   Do not use for massive payloads > 1MB per step (blob storage recommended instead).

## 4. Retries & Recovery

*   **Max Retries**: Currently hardcoded/implicit in logic or adapter config.
*   **Recovery Time**: Process restart requires manual or supervisor trigger. Recovery is instant upon process start (load from DB).

## 5. Known Bottlenecks

1.  **Polling Loop**: `pollUntilTerminal` blocks the event loop logic for that specific workflow execution if not careful, though `await new Promise` yields.
2.  **SQLite Contention**: High frequency updates effectively serialize all state changes.
3.  **Memory**: In-memory `Map` of adapters is small, but massive workflow specs could consume heap.
