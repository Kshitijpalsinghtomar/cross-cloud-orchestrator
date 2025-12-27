import { v4 as uuidv4 } from 'uuid';
import { CloudAdapter, ExecutionResult } from './adapter.interface';
import * as sqlite3 from 'sqlite3';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('cross-cloud-core');

// --- Types ---

export interface RetryPolicy {
    maxAttempts: number;
    initialIntervalMs: number;
    maxIntervalMs: number;
    backoffCoefficient: number; // e.g., 2.0 for exponential
    nonRetryableErrors?: string[]; // Error codes that fail immediately
}

export interface WorkflowStep {
    id: string;
    description?: string;
    dependencies?: string[]; // Array of step IDs this step depends on (DAG)
    primary?: string; // Optional if strategy is set
    fallbacks?: string[];
    strategy?: any; // Keeping generic for now, can be RoutingStrategy
    payload: any;
    timeoutMs?: number;
    retryPolicy?: RetryPolicy;
}

export interface WorkflowSpec {
    id: string;
    steps: WorkflowStep[];
}

export type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface StepState {
    stepId: string;
    status: StepStatus;
    attempts: number;
    output?: any;
    error?: any;
    startTime?: number;
    endTime?: number;
    providerUsed?: string;
    lastProvider?: string;
}

export interface WorkflowState {
    id: string;
    idempotencyKey?: string;
    spec: WorkflowSpec;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    stepStates: Record<string, StepState>; // Map stepId -> State
    results?: Record<string, any>; // Aggregate results for easy access
    createdAt: number;
    updatedAt: number;
}

export interface WorkflowDefinition {
    id: string;
    name: string;
    description?: string;
    definition: WorkflowSpec;
    createdAt: number;
    updatedAt: number;
}

// --- Persistence ---

export interface StateStore {
    save(wf: WorkflowState): Promise<void>;
    get(id: string): Promise<WorkflowState | undefined>;
    getByIdempotencyKey(key: string): Promise<WorkflowState | undefined>;
    list(status?: string): Promise<WorkflowState[]>;
}

export class InMemoryStateStore implements StateStore {
    private store = new Map<string, WorkflowState>();
    private idempotencyIndex = new Map<string, string>();

    async save(wf: WorkflowState): Promise<void> {
        this.store.set(wf.id, JSON.parse(JSON.stringify(wf))); // Deep copy
        if (wf.idempotencyKey) {
            this.idempotencyIndex.set(wf.idempotencyKey, wf.id);
        }
    }
    async get(id: string): Promise<WorkflowState | undefined> {
        const wf = this.store.get(id);
        return wf ? JSON.parse(JSON.stringify(wf)) : undefined;
    }
    async getByIdempotencyKey(key: string): Promise<WorkflowState | undefined> {
        const id = this.idempotencyIndex.get(key);
        return id ? this.get(id) : undefined;
    }
    async list(status?: string): Promise<WorkflowState[]> {
        const all = Array.from(this.store.values()).map(w => JSON.parse(JSON.stringify(w)));
        if (status) return all.filter(w => w.status === status);
        return all;
    }
}

export class SqliteStateStore implements StateStore {
    private db: sqlite3.Database;
    private initPromise: Promise<void>;

    constructor(dbPath: string = ':memory:') {
        this.db = new sqlite3.Database(dbPath);
        this.initPromise = this.init();
    }

    private init(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS workflows (
                    id TEXT PRIMARY KEY,
                    idempotency_key TEXT UNIQUE,
                    status TEXT,
                    state_json TEXT,
                    created_at INTEGER,
                    updated_at INTEGER
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async save(wf: WorkflowState): Promise<void> {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO workflows (id, idempotency_key, status, state_json, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?) 
                ON CONFLICT(id) DO UPDATE SET 
                    status=excluded.status, 
                    state_json=excluded.state_json,
                    updated_at=excluded.updated_at
            `);
            stmt.run(
                wf.id,
                wf.idempotencyKey || null,
                wf.status,
                JSON.stringify(wf),
                wf.createdAt,
                Date.now(),
                (err: Error | null) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
            stmt.finalize();
        });
    }

    async get(id: string): Promise<WorkflowState | undefined> {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT state_json FROM workflows WHERE id = ?`, [id], (err, row: any) => {
                if (err) reject(err);
                else resolve(row ? JSON.parse(row.state_json) : undefined);
            });
        });
    }

    async getByIdempotencyKey(key: string): Promise<WorkflowState | undefined> {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT state_json FROM workflows WHERE idempotency_key = ?`, [key], (err, row: any) => {
                if (err) reject(err);
                else resolve(row ? JSON.parse(row.state_json) : undefined);
            });
        });
    }

    async list(status?: string): Promise<WorkflowState[]> {
        await this.initPromise;
        let sql = `SELECT state_json FROM workflows`;
        const params: any[] = [];
        if (status) {
            sql += ` WHERE status = ?`;
            params.push(status);
        }

        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows: any[]) => {
                if (err) reject(err);
                else resolve(rows.map(row => JSON.parse(row.state_json)));
            });
        });
    }
}

// --- Definition Store ---

export interface DefinitionStore {
    save(def: WorkflowDefinition): Promise<void>;
    get(id: string): Promise<WorkflowDefinition | undefined>;
    list(): Promise<WorkflowDefinition[]>;
    delete(id: string): Promise<void>;
}

export class SqliteDefinitionStore implements DefinitionStore {
    private db: sqlite3.Database;
    private initPromise: Promise<void>;

    constructor(dbPath: string = './orchestrator.db') {
        this.db = new sqlite3.Database(dbPath);
        this.initPromise = this.init();
    }

    private init(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS workflow_definitions (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    description TEXT,
                    definition_json TEXT,
                    created_at INTEGER,
                    updated_at INTEGER
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async save(def: WorkflowDefinition): Promise<void> {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO workflow_definitions (id, name, description, definition_json, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?) 
                ON CONFLICT(id) DO UPDATE SET 
                    name=excluded.name, 
                    description=excluded.description,
                    definition_json=excluded.definition_json,
                    updated_at=excluded.updated_at
            `);
            stmt.run(
                def.id,
                def.name,
                def.description || null,
                JSON.stringify(def.definition),
                def.createdAt,
                Date.now(),
                (err: Error | null) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
            stmt.finalize();
        });
    }

    async get(id: string): Promise<WorkflowDefinition | undefined> {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM workflow_definitions WHERE id = ?`, [id], (err, row: any) => {
                if (err) reject(err);
                else if (!row) resolve(undefined);
                else resolve({
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    definition: JSON.parse(row.definition_json),
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                });
            });
        });
    }

    async list(): Promise<WorkflowDefinition[]> {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM workflow_definitions ORDER BY updated_at DESC`, [], (err, rows: any[]) => {
                if (err) reject(err);
                else resolve(rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    definition: JSON.parse(row.definition_json),
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                })));
            });
        });
    }

    async delete(id: string): Promise<void> {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM workflow_definitions WHERE id = ?`, [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

// --- Engine ---

export class WorkflowEngine {
    private adapters = new Map<string, CloudAdapter>();

    constructor(
        private store: StateStore = new SqliteStateStore()
    ) { }

    registerAdapter(name: string, adapter: CloudAdapter) {
        this.adapters.set(name, adapter);
    }

    async submitWorkflow(spec: WorkflowSpec, idempotencyKey?: string): Promise<string> {
        // 1. Idempotency Check
        if (idempotencyKey) {
            const existing = await this.store.getByIdempotencyKey(idempotencyKey);
            if (existing) {
                console.log(`[Idempotency] Returning existing workflow ${existing.id} for key ${idempotencyKey}`);
                return existing.id;
            }
        }

        // 2. Initialize State
        const id = uuidv4();
        const now = Date.now();
        const stepStates: Record<string, StepState> = {};

        for (const step of spec.steps) {
            stepStates[step.id] = {
                stepId: step.id,
                status: 'PENDING',
                attempts: 0
            };
        }

        const wf: WorkflowState = {
            id,
            idempotencyKey,
            spec,
            status: 'PENDING',
            stepStates,
            results: {},
            createdAt: now,
            updatedAt: now
        };

        // 3. Persist
        await this.store.save(wf);

        // 4. Start Background Execution
        this.runWorkflow(id).catch(err => {
            console.error(`[Engine] Background execution error for ${id}:`, err);
        });

        return id;
    }

    async getStatus(id: string): Promise<WorkflowState | undefined> {
        return this.store.get(id);
    }

    /**
     * Recover method to be called on startup.
     * Finds incomplete workflows and resumes them.
     */
    async recover() {
        console.log('[Engine] Starting recovery process...');
        const pendingWfs = await this.store.list('RUNNING'); // And 'PENDING'
        const initialPending = await this.store.list('PENDING'); // If any stuck in PENDING

        const toRecover = [...pendingWfs, ...initialPending];
        console.log(`[Engine] Found ${toRecover.length} workflows to recover.`);

        for (const wf of toRecover) {
            console.log(`[Engine] Recovering workflow ${wf.id}...`);
            this.runWorkflow(wf.id).catch(e => console.error(`[Engine] Recovery failed for ${wf.id}`, e));
        }
    }

    // --- Core Execution Logic (DAG + Retry) ---

    private async runWorkflow(id: string) {
        return tracer.startActiveSpan('runWorkflow', { attributes: { 'workflow.id': id } }, async (span) => {
            try {
                let wf = await this.store.get(id);
                if (!wf) {
                    span.addEvent('Workflow not found');
                    return;
                }

                if (wf.status === 'COMPLETED' || wf.status === 'FAILED') return;

                wf.status = 'RUNNING';
                await this.store.save(wf);

                // --- DAG Loop ---
                // Keep iterating until all steps COMPLETED or one FAILS (if fail-fast)
                let running = true;
                while (running) {
                    wf = (await this.store.get(id))!; // Reload fresh state
                    if (!wf) break;

                    const allSteps = wf.spec.steps;
                    const states = wf.stepStates;

                    // Check overall terminal state
                    const failedStep = Object.values(states).find(s => s.status === 'FAILED');
                    if (failedStep) {
                        wf.status = 'FAILED';
                        await this.store.save(wf);
                        running = false;
                        break;
                    }

                    const pendingSteps = allSteps.filter(s => states[s.id].status === 'PENDING');

                    if (pendingSteps.length === 0) {
                        // All steps processed. Are any RUNNING?
                        const runningCount = Object.values(states).filter(s => s.status === 'RUNNING').length;
                        if (runningCount === 0) {
                            // All done!
                            wf.status = 'COMPLETED';
                            await this.store.save(wf);
                            running = false;
                        } else {
                            await new Promise(r => setTimeout(r, 100));
                        }
                        continue;
                    }

                    // Find Executable Steps
                    const executable: WorkflowStep[] = [];
                    for (const step of pendingSteps) {
                        const deps = step.dependencies || [];
                        const depsMet = deps.every(dId => states[dId]?.status === 'COMPLETED');
                        if (depsMet) {
                            executable.push(step);
                        }
                    }

                    if (executable.length === 0) {
                        // No new executable steps. check if we are waiting for something?
                        const runningCount = Object.values(states).filter(s => s.status === 'RUNNING').length;
                        if (runningCount === 0 && pendingSteps.length > 0) {
                            // Deadlock or Logic Error?
                            // Could be a cycle or missing dependency.
                            console.error(`[Engine] Stalled workflow ${id}. Pending: ${pendingSteps.length}, Running: 0, Executable: 0`);
                            wf.status = 'FAILED';
                            await this.store.save(wf);
                            break;
                        }
                        await new Promise(r => setTimeout(r, 100));
                        continue;
                    }

                    // Launch Executable Steps in Parallel
                    await Promise.all(executable.map(step => this.executeStepWrapper(wf!, step)));
                }

            } catch (error: any) {
                console.error(`[Engine] Workflow Error ${id}:`, error);
                try {
                    const errWf = await this.store.get(id);
                    if (errWf) {
                        errWf.status = 'FAILED';
                        await this.store.save(errWf);
                    }
                } catch (e) { }
                span.recordException(error);
                span.setStatus({ code: SpanStatusCode.ERROR });
            } finally {
                span.end();
            }
        });
    }

    private async executeStepWrapper(wf: WorkflowState, step: WorkflowStep) {
        // Enclose ENTIRE block in trace/try-catch to properly capture errors including sync ones
        await tracer.startActiveSpan('executeStep', { attributes: { 'step.id': step.id } }, async (span) => {
            try {
                // Optimistic locking / refresh state
                // We need to set status to RUNNING to avoid double execution in next loop tick
                // WARNING: wf might be stale if called parallel, but we rely on single-thread loop launching this.
                // Re-fetch to be safe? 
                // For performance in strict DAG loop, using passed wf is 'okay' if we assume no external mutators.

                const stepState = wf.stepStates[step.id];
                if (!stepState) throw new Error(`State missing for step ${step.id}`);

                stepState.status = 'RUNNING';
                stepState.startTime = Date.now();
                await this.store.save(wf);

                const output = await this.executeStepWithRetries(step);

                // Reload WF to minimize race conditions (simplistic)
                const freshWf = (await this.store.get(wf.id))!;
                freshWf.stepStates[step.id].status = 'COMPLETED';
                freshWf.stepStates[step.id].output = output;
                freshWf.stepStates[step.id].endTime = Date.now();
                if (!freshWf.results) freshWf.results = {};
                freshWf.results[step.id] = output;

                await this.store.save(freshWf);
                span.setStatus({ code: SpanStatusCode.OK });

            } catch (error: any) {
                console.error(`[Engine] Step ${step.id} failed:`, error);
                try {
                    const freshWf = (await this.store.get(wf.id))!;
                    if (freshWf && freshWf.stepStates && freshWf.stepStates[step.id]) {
                        freshWf.stepStates[step.id].status = 'FAILED';
                        freshWf.stepStates[step.id].error = error.message || String(error);
                        freshWf.stepStates[step.id].endTime = Date.now();
                        await this.store.save(freshWf);
                    }
                } catch (saveErr) {
                    console.error('Failed to save fail state', saveErr);
                }

                span.recordException(error);
                span.setStatus({ code: SpanStatusCode.ERROR });
                // Ensure we don't crash Promise.all, but we WANT to stop the DAG.
                // The step status=FAILED will be detected by the loop.
            } finally {
                span.end();
            }
        });
    }

    private async executeStepWithRetries(step: WorkflowStep): Promise<any> {
        let attempts = 0;
        const policy = step.retryPolicy || { maxAttempts: 3, initialIntervalMs: 1000, maxIntervalMs: 10000, backoffCoefficient: 2 };

        while (attempts < policy.maxAttempts) {
            attempts++;
            try {
                return await this.executeSingleAttempt(step);
            } catch (error: any) {
                const isRetryable = this.isRetryable(error, policy);
                console.log(`[Engine] Step ${step.id} attempt ${attempts} failed. Retryable: ${isRetryable}`);

                if (!isRetryable || attempts >= policy.maxAttempts) {
                    throw error;
                }

                // Backoff
                const delay = Math.min(
                    policy.initialIntervalMs * Math.pow(policy.backoffCoefficient, attempts - 1),
                    policy.maxIntervalMs
                );
                // Add jitter
                const jitter = Math.random() * 0.1 * delay;
                await new Promise(r => setTimeout(r, delay + jitter));
            }
        }
    }

    private async executeSingleAttempt(step: WorkflowStep): Promise<any> {
        // Resolve Providers (simplified for now, re-using logic or just using primary)
        const candidates = [];
        if (step.primary) {
            const adapter = this.adapters.get(step.primary);
            if (adapter) candidates.push({ name: step.primary, adapter });
        }
        if (step.fallbacks) {
            for (const fb of step.fallbacks) {
                const adapter = this.adapters.get(fb);
                if (adapter) candidates.push({ name: fb, adapter });
            }
        }

        if (candidates.length === 0) throw new Error('No providers found for step ' + step.id);

        let lastError;
        for (const { name, adapter } of candidates) {
            try {
                console.log(`[Engine] Executing ${step.id} on ${name}`);
                const result = await adapter.executeStep(step.id, step.payload);
                if (result.success) {
                    return result.output;
                }
                // Handle provider error
                const err = new Error(result.errorCode || 'Provider Failed');
                (err as any).code = result.errorCode;
                (err as any).type = result.errorType;

                lastError = err;
                if (result.errorType === 'AUTH_ERROR') throw new Error(`Critical Auth Error on ${name}: ${result.errorCode}`);

            } catch (e: any) {
                lastError = e;
                console.warn(`[Engine] Provider ${name} failed:`, e.message);
                if (e.message?.includes('Critical Auth')) throw e; // Bubble up
            }
        }
        throw lastError || new Error('All providers failed');
    }

    private isRetryable(error: any, policy: RetryPolicy): boolean {
        // Check explicit non-retryable codes
        if (policy.nonRetryableErrors && policy.nonRetryableErrors.includes(error.code)) return false;
        if (error.type === 'NON_RETRYABLE' || error.type === 'AUTH_ERROR') return false;
        return true;
    }
}
