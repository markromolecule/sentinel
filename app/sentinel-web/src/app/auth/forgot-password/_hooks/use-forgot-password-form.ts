import { useForgotPasswordMutation } from '@sentinel/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ForgotPasswordSchema, ForgotPasswordSchemaType } from '@sentinel/shared/schema';
import { toast } from 'sonner';

export function useForgotPasswordForm() {
    const [authError, setAuthError] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');

    const form = useForm<ForgotPasswordSchemaType>({
        resolver: zodResolver(ForgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const { mutate: sendResetEmail, isPending: isLoading } = useForgotPasswordMutation({
        onSuccess: () => {
            setIsSubmitted(true);
            toast.success('Password reset link sent successfully!');
        },
        onError: (error) => {
            setAuthError(error.message);
            toast.error(error.message || 'Failed to send reset link.');
        },
    });

    const onSubmit = (data: ForgotPasswordSchemaType) => {
        setAuthError(null);
        setSubmittedEmail(data.email);
        
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const redirectTo = `${origin}/auth/callback?next=/auth/update-password`;

        sendResetEmail({
            email: data.email,
            redirectTo,
        });
    };

    const handleResend = () => {
        if (!submittedEmail) return;
        setAuthError(null);
        
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const redirectTo = `${origin}/auth/callback?next=/auth/update-password`;

        sendResetEmail({
            email: submittedEmail,
            redirectTo,
        });
    };

    return {
        form,
        authError,
        isLoading,
        isSubmitted,
        submittedEmail,
        onSubmit: form.handleSubmit(onSubmit),
        handleResend,
    };
}
