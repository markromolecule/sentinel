import * as z from "zod";

export const announcementFormSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    content: z.string().min(10, "Content must be at least 10 characters"),
    targetAudience: z.string().min(1, "Please select a target audience"),
    status: z.enum(["draft", "published"]),
    publishedAt: z.string().optional(),
});

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;
