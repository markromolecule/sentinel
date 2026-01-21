import { createSupabaseClient } from '@/data/supabase/client'
import { useState } from 'react'

export function useGoogleLogin() {
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createSupabaseClient()

    const loginWithGoogle = async () => {
        setIsLoading(true)
        console.log('Initiating Google Login...')
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: process.env.NEXT_PUBLIC_CALLBACK_URL || `${window.location.origin}/auth/callback`,
                },
            })
            if (error) throw error
        } catch (error) {
            console.error('Google Login Error:', error)
            alert('Failed to login with Google')
            setIsLoading(false)
        }
    }

    return { loginWithGoogle, isLoading }
}
