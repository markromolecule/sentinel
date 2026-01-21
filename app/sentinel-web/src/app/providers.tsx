'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // With SSR, we usually want to set some default staleTime
                        // above 0 to avoid refetching immediately on the client
                        staleTime: 60 * 1000,
                    },
                },
            })
    )

    return (
        <QueryClientProvider client={queryClient}>
            <ApiHealthCheck />
            {children}
        </QueryClientProvider>
    )
}

function ApiHealthCheck() {
    // Dynamically import or use hook here. Since it's a client component, we can use hooks.
    // However, hooks must be inside a component that is a child of QueryClientProvider.
    // So this internal component is perfect.

    // We import the hook here to avoid circular dependencies or context issues if defined outside
    const { useApiHealth } = require('@/hooks/query/api/use-api-health')
    const { data, isError } = useApiHealth()

    if (process.env.NODE_ENV === 'development') {
        if (data) console.log('API Health Check: Connected to', process.env.NEXT_PUBLIC_API_URL)
        if (isError) console.error('API Health Check: Failed to connect to', process.env.NEXT_PUBLIC_API_URL)
    }

    return null
}
