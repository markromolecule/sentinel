import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import { FormValues } from "@/app/(protected)/admin/exams/configuration/_types";

export function BasicInfoSection() {
    const { control } = useFormContext<FormValues>();

    return (
        <FormField
            control={control}
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
    );
}
