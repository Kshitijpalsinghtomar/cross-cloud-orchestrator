import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export const useWorkflows = () => {
    return useQuery({
        queryKey: ['workflows'],
        queryFn: () => api.listExecutions({ limit: 50, offset: 0 }).then(res => res.items),
        refetchInterval: 2000, // Poll every 2 seconds for live updates
    });
};

export const useWorkflow = (id: string) => {
    return useQuery({
        queryKey: ['workflow', id],
        queryFn: () => api.getExecution(id),
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return (status === 'RUNNING' || status === 'PENDING') ? 1000 : false;
        },
        enabled: !!id,
    });
};

export const useSubmitWorkflow = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ workflow, input }: { workflow: any; input: any }) =>
            api.submitWorkflow(workflow, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflows'] });
        },
    });
};
// --- Definitions ---

export const useDefinitions = () => {
    return useQuery({
        queryKey: ['definitions'],
        queryFn: () => api.listDefinitions(),
    });
};

export const useDefinition = (id: string | null) => {
    return useQuery({
        queryKey: ['definition', id],
        queryFn: () => api.getDefinition(id!),
        enabled: !!id,
    });
};

export const useSaveDefinition = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (def: any) => api.saveDefinition(def),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions'] });
        },
    });
};

export const useDeleteDefinition = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.deleteDefinition(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['definitions'] });
        },
    });
};
