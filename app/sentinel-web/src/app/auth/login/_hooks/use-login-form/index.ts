import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { LoginSchema, LoginSchemaType } from "@sentinel/shared";
import { useLoginMutation, LoginError } from "@/hooks/query/auth/use-login-mutation";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/data/supabase/client";

export function useLoginForm() {
    const router = useRouter();
    const [authError, setAuthError] = useState<string | null>(null);

    const form = useForm<LoginSchemaType>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
            remember: false
        }
    });

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

    const onSubmit = (data: LoginSchemaType) => {
        setAuthError(null);
        login({
            email: data.email,
            password: data.password
        });
    };

    return {
        form,
        authError,
        isLoading,
        onSubmit: form.handleSubmit(onSubmit)
    };
}
