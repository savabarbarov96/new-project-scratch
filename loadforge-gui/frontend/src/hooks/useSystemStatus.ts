import { useQuery } from '@tanstack/react-query';
import { healthCheckService } from '@/services/healthCheck';

export const useSystemStatus = () => {
  return useQuery({
    queryKey: ['systemStatus'],
    queryFn: () => healthCheckService.getSystemStatus(),
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 2,
    retryDelay: 1000,
    staleTime: 5000, // Consider data stale after 5 seconds
  });
};

export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => healthCheckService.getHealth(),
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
    retryDelay: 1000,
  });
};

export const useSystemMetrics = () => {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: () => healthCheckService.getMetrics(),
    refetchInterval: 15000, // Refetch every 15 seconds
    retry: 2,
    retryDelay: 1000,
  });
};

export default useSystemStatus; 