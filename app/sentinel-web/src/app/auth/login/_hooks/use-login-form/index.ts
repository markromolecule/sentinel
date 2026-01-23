import { useState } from "react";
import { LoginFormData, LoginFormErrors } from "../../_types";
import { useLoginMutation, LoginError } from "@/hooks/query/auth/use-login-mutation";
import { useRouter } from "next/navigation";

export function useLoginForm() {
    const router = useRouter();

    const [formData, setFormData] = useState<LoginFormData>({
        email: "",
        password: ""
    });

    const [errors, setErrors] = useState<LoginFormErrors>({
        email: false,
        password: false
    });

    const [authError, setAuthError] = useState<string | null>(null);

    const { mutate: login, isPending: isLoading } = useLoginMutation({
        onSuccess: () => {
            // Redirect to dashboard or home after successful login
            router.push('/dashboard');
        },
        onError: (error: LoginError) => {
            setAuthError(error.message);
        }
    });

    const handleBlur = (field: keyof LoginFormData) => {
        if (!formData[field].trim()) {
            setErrors(prev => ({ ...prev, [field]: true }));
        }
    };

    const handleChange = (field: keyof LoginFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (value.trim()) {
            setErrors(prev => ({ ...prev, [field]: false }));
        }
        // Clear auth error when user starts typing
        if (authError) {
            setAuthError(null);
        }
    };

    const handleSubmit = () => {
        // Validate fields
        const newErrors = { ...errors };
        let hasError = false;

        if (!formData.email.trim()) {
            newErrors.email = true;
            hasError = true;
        }
        if (!formData.password.trim()) {
            newErrors.password = true;
            hasError = true;
        }

        setErrors(newErrors);

        if (hasError) return;

        // Clear previous auth errors
        setAuthError(null);

        // Attempt login
        login({
            email: formData.email,
            password: formData.password
        });
    };

    return {
        formData,
        errors,
        authError,
        isLoading,
        handleBlur,
        handleChange,
        handleSubmit
    };
}
