import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { RegisterSchema, RegisterSchemaType } from "@sentinel/shared";
import { useSignUpMutation, SignUpError } from "@/hooks/query/auth/use-sign-up-mutation";
import { config } from "@/lib/config";

export function useRegisterForm() {
    const [authError, setAuthError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const form = useForm<RegisterSchemaType>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: "",
            terms: false
        }
    });

    const { mutate: signUp, isPending: isLoading } = useSignUpMutation({
        onSuccess: () => {
            setSuccessMessage('Registration successful! Please check your email to verify your account.');
        },
        onError: (error: SignUpError) => {
            setAuthError(error.message);
        }
    });

    const onSubmit = (data: RegisterSchemaType) => {
        setAuthError(null);
        setSuccessMessage(null);

        signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    role: 'student',
                },
                emailRedirectTo: `${config.appUrl}/auth/callback`,
            }
        });
    };

    return {
        form,
        authError,
        successMessage,
        isLoading,
        onSubmit: form.handleSubmit(onSubmit)
    };
}
