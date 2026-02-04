import { useState } from "react";
import { LoginFormData, LoginFormErrors } from "@sentinel/shared";
import { useLoginMutation, LoginError } from "@/hooks/query/auth/use-login-mutation";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/data/supabase/client";

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
        onSuccess: async (data) => {
            const user = data.user;
            const role = user?.user_metadata?.role;

            if (role === 'student') {
                // Check if student record exists
                const supabase = createSupabaseClient();
                const { data: studentData } = await supabase
                    .from('students')
                    .select('student_id')
                    .eq('user_id', user?.id)
                    .single();

                if (studentData) {
                    router.push('/student');
                } else {
                    router.push('/onboarding');
                }
            } else if (role === 'proctor') {
                router.push('/proctor/dashboard');
            } else {
                router.push('/admin/dashboard');
            }
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
