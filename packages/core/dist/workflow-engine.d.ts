import { WorkflowDefinition } from './types';
import { StateStore } from './state-store';
import { CloudFunctionAdapter } from './interfaces';
export declare class WorkflowEngine {
    private stateStore;
    private adapters;
    constructor(stateStore: StateStore, adapters: Map<string, CloudFunctionAdapter>);
    startWorkflow(def: WorkflowDefinition, input: any): Promise<string>;
    runWorkflow(executionId: string, def: WorkflowDefinition): Promise<void>;
    private executeStep;
    private executeTaskStep;
    private getNextStepId;
    private evaluateCondition;
}
