import { z } from "zod";
import { formSchema } from "@/app/(protected)/admin/exam-config/_constants";
import { ExamConfig } from "@/app/(protected)/admin/_types";

export type FormValues = z.infer<typeof formSchema>;

export interface UseExamConfigFormProps {
    defaultValues: ExamConfig;
}
