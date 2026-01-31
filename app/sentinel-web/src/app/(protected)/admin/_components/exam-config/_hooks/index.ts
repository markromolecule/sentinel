import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formSchema } from "@/app/(protected)/admin/_components/exam-config/_constants/index";
import { FormValues, UseExamConfigFormProps } from "@/app/(protected)/admin/_components/exam-config/_types";

export function useExamConfigForm({ defaultValues }: UseExamConfigFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: defaultValues.name,
            allowedDevices: defaultValues.allowedDevices,
            cameraRequired: defaultValues.cameraRequired,
            micRequired: defaultValues.micRequired,
            aiRules: defaultValues.aiRules,
            maxReconnectAttempts: defaultValues.maxReconnectAttempts,
            autoSubmitTimeout: defaultValues.autoSubmitTimeout,
        },
    });

    const onSubmit: SubmitHandler<FormValues> = (values) => {
        console.log(values);
        toast.success("Global exam policy updated successfully.");
    };

    return {
        form,
        onSubmit,
    };
}
