import { v4 as uuidv4 } from 'uuid';
import { CloudAdapter, ExecutionResult } from './adapter.interface';
import * as sqlite3 from 'sqlite3';
import { trace, context, trace as apiTrace, SpanStatusCode } from '@opentelemetry/api';
// Use require to avoid TS import issues with OTel
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// --- OTel Setup ---
const provider = new NodeTracerProvider({
    resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: 'cross-cloud-core',
    }),
});
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.register();

const tracer = trace.getTracer('cross-cloud-core');
import { promisify } from 'util';

// --- Types ---

export interface WorkflowSpec {
    id: string;
    steps: WorkflowStep[];
}

export interface WorkflowStep {
    id: string;
    primary: string;
    fallbacks?: string[];
    payload: any;
}

export interface WorkflowState {
    id: string;
    idempotencyKey?: string;
    spec: WorkflowSpec;
    currentStep: number;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    providerHistory: Array<{
        step: string;
        provider: string;
        success: boolean;
        error?: any;
        execId?: string;
        timestamp: number;
    }>;
    results?: Record<string, any>;
}

// --- Persistence ---

export interface StateStore {
    save(wf: WorkflowState): Promise<void>;
    get(id: string): Promise<WorkflowState | undefined>;
    getByIdempotencyKey(key: string): Promise<WorkflowState | undefined>;
}

export class InMemoryStateStore implements StateStore {
    private store = new Map<string, WorkflowState>();
    private idempotencyIndex = new Map<string, string>(); // key -> wfId

    async save(wf: WorkflowState): Promise<void> {
        this.store.set(wf.id, { ...wf });
        if (wf.idempotencyKey) {
            this.idempotencyIndex.set(wf.idempotencyKey, wf.id);
        }
    }
    async get(id: string): Promise<WorkflowState | undefined> {
        const wf = this.store.get(id);
        return wf ? { ...wf } : undefined;
    }
    async getByIdempotencyKey(key: string): Promise<WorkflowState | undefined> {
        const id = this.idempotencyIndex.get(key);
        return id ? this.get(id) : undefined;
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
          state_json TEXT
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
        INSERT INTO workflows (id, idempotency_key, state_json) 
        VALUES (?, ?, ?) 
        ON CONFLICT(id) DO UPDATE SET state_json=excluded.state_json
      `);
            stmt.run(wf.id, wf.idempotencyKey || null, JSON.stringify(wf), (err: Error | null) => {
                if (err) reject(err);
                else resolve();
            });
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

    async close(): Promise<void> {
        try { await this.initPromise; } catch (e) { }
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) console.warn('DB Close Warning:', err);
                resolve(); // Always resolve to avoid crashing tests
            });
        });
    }
}

// --- Engine ---

export class WorkflowEngine {
    private adapters = new Map<string, CloudAdapter>();

    constructor(private store: StateStore = new SqliteStateStore()) { }

    registerAdapter(name: string, adapter: CloudAdapter) {
        this.adapters.set(name, adapter);
    }

    async submitWorkflow(spec: WorkflowSpec, idempotencyKey?: string): Promise<string> {
        // 1. Check Idempotency
        if (idempotencyKey) {
            const existing = await this.store.getByIdempotencyKey(idempotencyKey);
            if (existing) {
                console.log(`[Idempotency] Returning existing workflow ${existing.id} for key ${idempotencyKey}`);
                return existing.id;
            }
        }

        // 2. Create New
        const id = uuidv4();
        const wf: WorkflowState = {
            id,
            idempotencyKey,
            spec,
            currentStep: 0,
            status: 'PENDING',
            providerHistory: [],
            results: {}
        };

        // 3. Persist Initial State
        await this.store.save(wf);

        // 4. Start (Async)
        this.runWorkflow(id).catch(err => console.error(`Background workflow execution failed: ${err}`));

        return id;
    }

    async getStatus(id: string): Promise<WorkflowState | undefined> {
        return this.store.get(id);
    }

    // Resume or start execution
    private async runWorkflow(id: string) {
        return tracer.startActiveSpan('runWorkflow', { attributes: { 'workflow.id': id } }, async (span) => {
            // Logging context
            const log = (msg: string) => console.log(`[${id}] ${msg}`);

            try {
                const wf = await this.store.get(id);
                if (!wf) {
                    span.addEvent('Workflow not found');
                    span.setStatus({ code: SpanStatusCode.ERROR, message: 'Workflow not found' });
                    return;
                }

                if (wf.status === 'COMPLETED' || wf.status === 'FAILED') {
                    span.end();
                    return;
                }

                wf.status = 'RUNNING';
                if (!wf.results) wf.results = {};
                await this.store.save(wf);

                for (const step of wf.spec.steps) {
                    // Check if step already done (simple check)
                    const isDone = wf.providerHistory.some(h => h.step === step.id && h.success);
                    if (isDone) continue;

                    wf.currentStep = wf.spec.steps.indexOf(step); // roughly logic
                    await this.store.save(wf);

                    const providers = [step.primary, ...(step.fallbacks || [])];
                    let stepSuccess = false;

                    await tracer.startActiveSpan('executeStep', {
                        attributes: {
                            'step.id': step.id,
                            'workflow.id': id
                        }
                    }, async (stepSpan) => {
                        for (const provider of providers) {
                            const adapter = this.adapters.get(provider);
                            if (!adapter) {
                                log(`Provider ${provider} not found!`);
                                continue;
                            }

                            try {
                                log(`Executing step ${step.id} on ${provider}...`);
                                stepSpan.addEvent('attempt_execution', { provider });

                                const result = await adapter.executeStep(step.id, step.payload);

                                if (!result.success) {
                                    const errorType = result.errorType || 'NON_RETRYABLE';
                                    log(`Step ${step.id} failed on ${provider} [${errorType}]: ${result.errorCode}`);
                                    stepSpan.setAttribute('error', true);
                                    stepSpan.setAttribute('error.type', errorType);
                                    stepSpan.recordException(new Error(result.errorCode || 'Unknown Error'));

                                    this.recordHistory(wf, step.id, provider, false, result.errorCode || result.details);
                                    await this.store.save(wf);

                                    if (errorType === 'RETRYABLE') {
                                        log(`  -> Retrying ${provider} (NOT IMPLEMENTED YET, SKIPPING TO FALLBACK FOR V1)...`);
                                        continue;
                                    } else if (errorType === 'AUTH_ERROR') {
                                        log(`  -> Critical Auth Error on ${provider}. Failing workflow.`);
                                        wf.status = 'FAILED';
                                        throw new Error(`Critical Auth Error on ${provider}`);
                                    } else {
                                        // PROVIDER_DOWN, NON_RETRYABLE, TIMEOUT -> Try next fallback
                                        continue;
                                    }
                                }

                                log(`Step ${step.id} succeeded on ${provider}`);
                                this.recordHistory(wf, step.id, provider, true, undefined, result.id);
                                if (!wf.results) wf.results = {};
                                wf.results![step.id] = result.output; // Store step output
                                stepSuccess = true;
                                break;

                            } catch (e: any) {
                                log(`Internal error execution step on ${provider}: ${e.message}`);
                                stepSpan.recordException(e);
                                if (e.message?.includes('Critical Auth Error')) throw e;
                            }
                        }
                        stepSpan.end();
                    });

                    if (!stepSuccess) {
                        wf.status = 'FAILED';
                        await this.store.save(wf);
                        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Step failed' });
                        return; // Stop workflow
                    }
                }

                wf.status = 'COMPLETED';
                await this.store.save(wf);
                span.setStatus({ code: SpanStatusCode.OK });
            } catch (e: any) {
                log(`Workflow failed: ${e.message}`);
                span.recordException(e);
                span.setStatus({ code: SpanStatusCode.ERROR });
                // Ensure we save failed state
                try {
                    const wf = await this.store.get(id);
                    if (wf) {
                        wf.status = 'FAILED';
                        await this.store.save(wf);
                    }
                } catch (err2) { console.error('Failed to save fail state', err2); }
            } finally {
                span.end();
            }
        });
    }

    private recordHistory(wf: WorkflowState, stepId: string, provider: string, success: boolean, error?: any, execId?: string) {
        wf.providerHistory.push({
            step: stepId,
            provider,
            success,
            error,
            execId,
            timestamp: Date.now()
        });
    }

    private async pollUntilTerminal(adapter: CloudAdapter, execId: string, timeoutMs = 15000): Promise<string> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            try {
                const statusRes = await adapter.getStatus(execId);
                if (['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(statusRes.status)) {
                    return statusRes.status;
                }
            } catch (e) {
                // ignore transient poll errors
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        return 'TIMEOUT';
    }
}
