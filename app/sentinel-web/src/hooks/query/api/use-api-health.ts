import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/data/api/client'

export function useApiHealth() {
    return useQuery({
        queryKey: ['api-health'],
        queryFn: () => apiClient('/'),
        retry: 1,
        refetchOnWindowFocus: false,
    })
}
