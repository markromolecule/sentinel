import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useFormContext } from "react-hook-form";
import { FormValues } from "@/app/(protected)/admin/exams/configuration/_types";

export function DeviceHardwareSection() {
    const { control } = useFormContext<FormValues>();

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Device & Hardware</h3>
            <FormField
                control={control}
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
            <FormField
                control={control}
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
    );
}
