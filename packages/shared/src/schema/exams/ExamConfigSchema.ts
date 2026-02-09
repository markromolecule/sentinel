import * as z from "zod";

export const examConfigFormSchema = z.object({
    name: z.string().min(2, {
        message: "Policy name must be at least 2 characters.",
    }),
    allowedDevices: z.array(z.string()).refine((value) => value.some((item) => item), {
        message: "You have to select at least one device.",
    }),
    cameraRequired: z.boolean().default(false),
    micRequired: z.boolean().default(false),
    aiRules: z.object({
        faceDetection: z.boolean().default(false),
        tabSwitching: z.boolean().default(false),
        gazeTracking: z.boolean().default(false),
        audioDetection: z.boolean().default(false),
    }),
    maxReconnectAttempts: z.coerce.number().min(1).max(10),
    autoSubmitTimeout: z.coerce.number().min(1).max(60),
});

export type ExamConfigFormValues = z.infer<typeof examConfigFormSchema>;
