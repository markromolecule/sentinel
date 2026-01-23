import { useState } from "react";
import { RegisterFormData, RegisterFormErrors } from "../../_types";
import { useSignUpMutation } from "@/hooks/query/auth/use-sign-up-mutation";

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

    const { mutate: signUp, isPending: isLoading } = useSignUpMutation({
        onSuccess: () => {
            alert('Registration successful! Please check your email to verify your account.');
        },
        onError: (error) => {
            alert(error.message);
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
            alert("Passwords do not match");
        }

        setErrors(newErrors);

        if (hasError) return;

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
        isLoading,
        handleBlur,
        handleChange,
        handleSubmit
    };
}
