import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formSchema } from "@/app/(protected)/proctor/exams/configuration/_constants";
import { FormValues, UseExamConfigFormProps } from "@/app/(protected)/proctor/exams/configuration/_types";

export function useExamConfigForm({ defaultValues }: UseExamConfigFormProps) {
    const form = useForm<FormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
