import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export const useSystemHealth = () => {
    return useQuery({
        queryKey: ['health'],
        queryFn: api.getHealth,
        refetchInterval: 5000,
    });
};

export const useDeepHealth = () => {
    return useQuery({
        queryKey: ['deep-health'],
        queryFn: api.getDeepHealth,
        refetchInterval: 10000,
    });
};

export const useDashboardSummary = () => {
    return useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: api.getDashboardSummary,
        refetchInterval: 5000,
    });
};
