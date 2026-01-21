import { createSupabaseClient } from '@/data/supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const apiClient = async (
    endpoint: string,
    options: RequestInit = {}
) => {
    const supabase = createSupabaseClient()
    const {
        data: { session },
    } = await supabase.auth.getSession()

    const headers = new Headers(options.headers)

    if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`)
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    })

    // Handle errors
    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`)
    }

    // Handle plain text response
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
        return response.json()
    }

    return response.text()
}
