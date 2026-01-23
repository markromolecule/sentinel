import { useState } from "react";
import { RegisterFormData, RegisterFormErrors } from "../../_types";
import { useSignUpMutation, SignUpError } from "@/hooks/query/auth/use-sign-up-mutation";

export function useRegisterForm() {
    const [formData, setFormData] = useState<RegisterFormData>({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [errors, setErrors] = useState<RegisterFormErrors>({
        firstName: false,
        lastName: false,
        email: false,
        password: false,
        confirmPassword: false
    });

    const [authError, setAuthError] = useState<string | null>(null);
    const [passwordMismatch, setPasswordMismatch] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { mutate: signUp, isPending: isLoading } = useSignUpMutation({
        onSuccess: () => {
            setSuccessMessage('Registration successful! Please check your email to verify your account.');
        },
        onError: (error: SignUpError) => {
            setAuthError(error.message);
        }
    });

    const handleBlur = (field: keyof RegisterFormData) => {
        if (!formData[field].trim()) {
            setErrors(prev => ({ ...prev, [field]: true }));
        }
    };

    const handleChange = (field: keyof RegisterFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (value.trim()) {
            setErrors(prev => ({ ...prev, [field]: false }));
        }
        // Clear auth error when user starts typing
        if (authError) {
            setAuthError(null);
        }
        // Clear password mismatch when editing password fields
        if ((field === 'password' || field === 'confirmPassword') && passwordMismatch) {
            setPasswordMismatch(false);
        }
    };

    const handleSubmit = () => {
        const newErrors = { ...errors };
        let hasError = false;

        Object.keys(formData).forEach((key) => {
            const field = key as keyof RegisterFormData;
            if (!formData[field].trim()) {
                newErrors[field] = true;
                hasError = true;
            }
        });

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = true;
            hasError = true;
            setPasswordMismatch(true);
        }

        setErrors(newErrors);

        if (hasError) return;

        // Clear previous errors
        setAuthError(null);
        setSuccessMessage(null);

        signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                }
            }
        });
    };

    return {
        formData,
        errors,
        authError,
        passwordMismatch,
        successMessage,
        isLoading,
        handleBlur,
        handleChange,
        handleSubmit
    };
}
