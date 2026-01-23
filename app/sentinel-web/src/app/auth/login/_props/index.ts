import { LoginFormData, LoginFormErrors } from "../_types";

export interface LoginFormProps {
    formData: LoginFormData;
    errors: LoginFormErrors;
    handleChange: (field: keyof LoginFormData, value: string) => void;
    handleBlur: (field: keyof LoginFormData) => void;
}