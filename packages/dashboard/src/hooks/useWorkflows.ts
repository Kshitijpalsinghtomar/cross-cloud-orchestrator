import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export const useWorkflows = () => {
    return useQuery({
        queryKey: ['workflows'],
        queryFn: api.listExecutions,
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
