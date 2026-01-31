import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import { FormValues } from "@/app/(protected)/admin/exam-config/_types";

export function SecuritySettingsSection() {
    const { control } = useFormContext<FormValues>();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={control}
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
            <FormField
                control={control}
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
    );
}
