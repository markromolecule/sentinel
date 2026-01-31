"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExamConfig } from "@/app/(protected)/admin/_types";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
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

interface ExamConfigFormProps {
    defaultValues: ExamConfig;
}

type FormValues = z.infer<typeof formSchema>;

export function ExamConfigForm({ defaultValues }: ExamConfigFormProps) {
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

    function onSubmit(values: FormValues) {
        console.log(values);
        toast.success("Global exam policy updated successfully.");
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Global Exam Settings</CardTitle>
                        <CardDescription>
                            Define system-wide rules for exam integrity and environment. Proctors will inherit these settings.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField<FormValues, "name">
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Policy Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Default Strict Policy" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Device & Hardware</h3>
                            <FormField<FormValues, "cameraRequired">
                                control={form.control}
                                name="cameraRequired"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Camera Requirement</FormLabel>
                                            <FormDescription>
                                                Force camera to be on during the entire exam session.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField<FormValues, "micRequired">
                                control={form.control}
                                name="micRequired"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Microphone Requirement</FormLabel>
                                            <FormDescription>
                                                Force microphone to be enabled for audio monitoring.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Artificial Intelligence Proctoring</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField<FormValues, "aiRules.faceDetection">
                                    control={form.control}
                                    name="aiRules.faceDetection"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Face Detection</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField<FormValues, "aiRules.gazeTracking">
                                    control={form.control}
                                    name="aiRules.gazeTracking"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Gaze Tracking</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField<FormValues, "aiRules.tabSwitching">
                                    control={form.control}
                                    name="aiRules.tabSwitching"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Tab Switching Monitor</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField<FormValues, "aiRules.audioDetection">
                                    control={form.control}
                                    name="aiRules.audioDetection"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Audio Anomaly Detection</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField<FormValues, "maxReconnectAttempts">
                                control={form.control}
                                name="maxReconnectAttempts"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Max Reconnect Attempts</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Limit how many times a student can rejoin.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField<FormValues, "autoSubmitTimeout">
                                control={form.control}
                                name="autoSubmitTimeout"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Auto-Submit Timeout (mins)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Time before exam auto-submits upon disconnect.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit">Save Global Settiings</Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
}
