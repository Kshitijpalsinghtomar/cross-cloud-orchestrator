import { v4 as uuidv4 } from 'uuid';
import { CloudAdapter, ExecutionResult } from './adapter.interface';
import * as sqlite3 from 'sqlite3';
import { trace, context, trace as apiTrace, SpanStatusCode } from '@opentelemetry/api';
// Use import to ensure correct module resolution
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { PolicyEngine, RoutingStrategy } from './policy.engine';

// --- OTel Setup ---
// --- OTel Setup ---
// const provider = new NodeTracerProvider({
//     resource: resourceFromAttributes({
//         [SEMRESATTRS_SERVICE_NAME]: 'cross-cloud-core',
//     }),
// });
// (provider as any).addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
// provider.register();

const tracer = trace.getTracer('cross-cloud-core');
import { promisify } from 'util';

// --- Types ---

export interface WorkflowSpec {
    id: string;
    steps: WorkflowStep[];
}

export interface WorkflowStep {
    id: string;
    primary?: string; // Optional if strategy is set
    fallbacks?: string[];
    strategy?: RoutingStrategy;
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
    list(): Promise<WorkflowState[]>;
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
    async list(): Promise<WorkflowState[]> {
        return Array.from(this.store.values());
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

    async list(): Promise<WorkflowState[]> {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT state_json FROM workflows`, (err, rows: any[]) => {
                if (err) reject(err);
                else resolve(rows.map(row => JSON.parse(row.state_json)));
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
    private policyEngine: PolicyEngine;

    constructor(private store: StateStore = new SqliteStateStore(), policyEngine?: PolicyEngine) {
        this.policyEngine = policyEngine || new PolicyEngine();
    }

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

                        // --- 1. Resolve Providers based on Policy & Strategy ---
                        let candidateAdapters: CloudAdapter[] = [];

                        if (step.strategy) {
                            // Smart Routing: Use all available adapters filtered by policy
                            candidateAdapters = this.policyEngine.filterProviders(this.adapters);
                            candidateAdapters = this.policyEngine.sortProviders(candidateAdapters, step.strategy);
                            log(`Smart Routing (${step.strategy.type}): Found ${candidateAdapters.length} candidates.`);
                        } else {
                            // Explicit Definition: Use primary + fallbacks
                            const names = [step.primary!, ...(step.fallbacks || [])].filter(Boolean);
                            // Still check policies! logic: map name -> adapter -> check policy
                            for (const name of names) {
                                const adapter = this.adapters.get(name);
                                if (adapter) {
                                    // Verify against "DENY" policies at least?
                                    // For now, let's treat explicit as "user knows best" BUT
                                    // strict compliance policies (DENY) should probably still apply?
                                    // Let's apply filterProviders to the explicit list to be safe.
                                    const filtered = this.policyEngine.filterProviders(new Map([[name, adapter]]));
                                    if (filtered.length > 0) {
                                        candidateAdapters.push(adapter);
                                    } else {
                                        log(`Provider ${name} blocked by policy.`);
                                    }
                                } else {
                                    log(`Provider ${name} not found!`);
                                }
                            }
                        }

                        if (candidateAdapters.length === 0) {
                            log(`No valid providers found for step ${step.id} (Check policies or config)`);
                            stepSpan.setAttribute('error', true);
                            stepSpan.recordException(new Error('No valid providers'));
                            // This will fall through to 'stepSuccess = false'
                        }

                        // --- 2. Try Execution ---
                        for (const adapter of candidateAdapters) {
                            // We need to find the "name" of the adapter for logging history.
                            // In a real system adapter might have a .name property.
                            // Or we search the map. Efficient enough?
                            let providerName = 'unknown';
                            for (const [key, val] of this.adapters.entries()) {
                                if (val === adapter) { providerName = key; break; }
                            }

                            try {
                                log(`Executing step ${step.id} on ${providerName}...`);
                                stepSpan.addEvent('attempt_execution', { provider: providerName });

                                const result = await adapter.executeStep(step.id, step.payload);

                                if (!result.success) {
                                    const errorType = result.errorType || 'NON_RETRYABLE';
                                    log(`Step ${step.id} failed on ${providerName} [${errorType}]: ${result.errorCode}`);
                                    stepSpan.setAttribute('error', true);
                                    stepSpan.setAttribute('error.type', errorType);
                                    stepSpan.recordException(new Error(result.errorCode || 'Unknown Error'));

                                    this.recordHistory(wf, step.id, providerName, false, result.errorCode || result.details);
                                    await this.store.save(wf);

                                    if (errorType === 'RETRYABLE') {
                                        log(`  -> Retrying ${providerName} (NOT IMPLEMENTED YET, SKIPPING TO FALLBACK FOR V1)...`);
                                        continue;
                                    } else if (errorType === 'AUTH_ERROR') {
                                        log(`  -> Critical Auth Error on ${providerName}. Failing workflow.`);
                                        wf.status = 'FAILED';
                                        throw new Error(`Critical Auth Error on ${providerName}`);
                                    } else {
                                        // PROVIDER_DOWN, NON_RETRYABLE, TIMEOUT -> Try next fallback
                                        continue;
                                    }
                                }

                                log(`Step ${step.id} succeeded on ${providerName}`);
                                this.recordHistory(wf, step.id, providerName, true, undefined, result.id);
                                if (!wf.results) wf.results = {};
                                wf.results![step.id] = result.output; // Store step output
                                stepSuccess = true;
                                break;

                            } catch (e: any) {
                                log(`Internal error execution step on ${providerName}: ${e.message}`);
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
