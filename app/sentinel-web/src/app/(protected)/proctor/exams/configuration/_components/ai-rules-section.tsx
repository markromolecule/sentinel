import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useFormContext } from "react-hook-form";
import { FormValues } from "@/app/(protected)/proctor/exams/configuration/_types";

export function AiRulesSection() {
    const { control } = useFormContext<FormValues>();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={control}
                name="aiRules.faceDetection"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                        <div className="space-y-0.5">
                            <FormLabel className="font-normal">Face Detection</FormLabel>
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
            <FormField
                control={control}
                name="aiRules.gazeTracking"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                        <div className="space-y-0.5">
                            <FormLabel className="font-normal">Gaze Tracking</FormLabel>
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
            <FormField
                control={control}
                name="aiRules.tabSwitching"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                        <div className="space-y-0.5">
                            <FormLabel className="font-normal">Tab Switching Monitor</FormLabel>
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
            <FormField
                control={control}
                name="aiRules.audioDetection"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                        <div className="space-y-0.5">
                            <FormLabel className="font-normal">Audio Anomaly Detection</FormLabel>
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
    );
}
