import { StateStore, WorkflowExecution, ExecutionEvent, WorkflowDefinition } from '@cc-orch/core';
import { prisma } from '@cc-orch/database';

export class PrismaStateStore implements StateStore {

    async createExecution(execution: WorkflowExecution, definition?: WorkflowDefinition): Promise<void> {
        if (definition) {
            // Ensure workflow definition exists (upsert)
            await prisma.workflowDefinition.upsert({
                where: { id: definition.id },
                create: {
                    id: definition.id,
                    name: definition.name,
                    steps: JSON.stringify(definition.steps)
                },
                update: {
                    steps: JSON.stringify(definition.steps)
                }
            });
        }

        await prisma.execution.create({
            data: {
                id: execution.executionId,
                workflowId: execution.workflowId,
                status: execution.status,
                context: JSON.stringify(execution.context),
                startedAt: execution.startedAt,
                finishedAt: execution.finishedAt
            }
        });
    }

    async updateExecution(execution: WorkflowExecution): Promise<void> {
        await prisma.execution.update({
            where: { id: execution.executionId },
            data: {
                status: execution.status,
                context: JSON.stringify(execution.context),
                finishedAt: execution.finishedAt
            }
        });
    }

    async getExecution(executionId: string): Promise<WorkflowExecution | null> {
        const exec = await prisma.execution.findUnique({
            where: { id: executionId },
            include: { logs: true, workflow: true }
        });

        if (!exec) return null;

        return {
            executionId: exec.id,
            workflowId: exec.workflowId,
            status: exec.status as any,
            context: JSON.parse(exec.context),
            startedAt: exec.startedAt,
            finishedAt: exec.finishedAt || undefined,
            history: exec.logs.map((log: any) => ({
                type: log.type as any,
                stepId: log.stepId || undefined,
                details: log.details ? JSON.parse(log.details) : undefined,
                timestamp: log.timestamp
            })),
            updatedAt: new Date()
        };
    }

    async listExecutions(): Promise<WorkflowExecution[]> {
        const execs = await prisma.execution.findMany({
            orderBy: { startedAt: 'desc' },
            include: { logs: true }
        });

        return execs.map((exec: any) => ({
            executionId: exec.id,
            workflowId: exec.workflowId,
            status: exec.status as any,
            context: JSON.parse(exec.context),
            startedAt: exec.startedAt,
            finishedAt: exec.finishedAt || undefined,
            history: exec.logs.map((log: any) => ({
                type: log.type as any,
                stepId: log.stepId || undefined,
                details: log.details ? JSON.parse(log.details) : undefined,
                timestamp: log.timestamp
            })),
            updatedAt: new Date()
        }));
    }

    async addHistoryEvent(executionId: string, event: ExecutionEvent): Promise<void> {
        await prisma.executionLog.create({
            data: {
                executionId: executionId,
                type: event.type,
                stepId: event.stepId,
                details: event.details ? JSON.stringify(event.details) : undefined,
                timestamp: event.timestamp
            }
        });
    }

    async acquireLock(resourceId: string, ttlMs: number): Promise<boolean> {
        return true;
    }

    async releaseLock(resourceId: string): Promise<void> {
        // No-op
    }
}
