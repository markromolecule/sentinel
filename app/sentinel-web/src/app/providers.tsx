'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export default function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // to avoid refetching
                    },
                },
            }
            )
    )

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <ApiHealthCheck />
                {children}
                <Toaster />
            </ThemeProvider>
        </QueryClientProvider>
    )
}

function ApiHealthCheck() {
    const { useApiHealth } = require('@/hooks/query/api/use-api-health')
    const { data, isError } = useApiHealth()

    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        if (data)
            console.log('API Health Check: Connected to', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
        if (isError)
            console.error('API Health Check: Failed to connect to', process.env.NEXT_PUBLIC_API_URL)
    }

    return null
}
