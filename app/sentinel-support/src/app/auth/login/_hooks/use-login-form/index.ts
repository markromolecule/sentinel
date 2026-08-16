import { LoginError, useLoginMutation } from '@sentinel/hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { LoginSchema, LoginSchemaType } from '@sentinel/shared/schema';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createSupabaseClient } from '@/data/supabase/client';
import { REMEMBERED_EMAIL_KEYS } from '@sentinel/shared/constants';

export function useLoginForm() {
    const router = useRouter();
    const [authError, setAuthError] = useState<string | null>(null);
    const supabase = createSupabaseClient();

    const form = useForm<LoginSchemaType>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: '',
            password: '',
            remember: false,
        },
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEYS.SUPPORT);
            if (savedEmail) {
                form.setValue('email', savedEmail);
                form.setValue('remember', true);
            }
        }
    }, [form]);

    const { mutate: login, isPending: isLoading } = useLoginMutation({
        onSuccess: async (data) => {
            // Handle Remember Me persistence
            const rememberMe = form.getValues('remember');
            if (rememberMe) {
                localStorage.setItem(REMEMBERED_EMAIL_KEYS.SUPPORT, data.user?.email || '');
            } else {
                localStorage.removeItem(REMEMBERED_EMAIL_KEYS.SUPPORT);
            }

            const role = data.user?.user_metadata?.role;

            if (role === 'support') {
                toast.success('Welcome support!');
                router.push('/dashboard');
            } else {
                await supabase.auth.signOut();
                setAuthError('Unauthorized. This portal is for support accounts only.');
                toast.error('Unauthorized access attempt.');
            }
        },
        onError: (error: LoginError) => {
            setAuthError(error.message);
        },
    });

    const onSubmit = (data: LoginSchemaType) => {
        setAuthError(null);
        login({
            email: data.email,
            password: data.password,
        });
    };

    return {
        form,
        authError,
        isLoading,
        onSubmit: form.handleSubmit(onSubmit),
    };
}
