import { SignUpError, useSignUpMutation } from '@sentinel/hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { RegisterSchema } from '@sentinel/shared/schema';
import { RegisterSchemaType } from '@sentinel/shared/schema';
import { config } from '@/lib/config';
import { useRouter } from 'next/navigation';

export function useRegisterForm() {
    const router = useRouter();
    const [authError, setAuthError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const form = useForm<RegisterSchemaType>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            terms: false,
        },
    });

    const { mutate: signUp, isPending: isLoading } = useSignUpMutation({
        onSuccess: (data) => {
            if (data.session) {
                router.push('/onboarding');
                router.refresh();
            } else {
                setSuccessMessage(
                    'Registration successful! Please check your email to verify your account.',
                );
            }
        },
        onError: (error: SignUpError) => {
            setAuthError(error.message);
        },
    });

    const onSubmit = (data: RegisterSchemaType) => {
        setAuthError(null);
        setSuccessMessage(null);
        const appUrl =
            typeof window !== 'undefined' && window.location.origin
                ? window.location.origin
                : config.appUrl;

        signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    role: 'student',
                },
                emailRedirectTo: `${appUrl}/auth/callback`,
            },
        });
    };

    return {
        form,
        authError,
        successMessage,
        isLoading,
        onSubmit: form.handleSubmit(onSubmit),
    };
}
