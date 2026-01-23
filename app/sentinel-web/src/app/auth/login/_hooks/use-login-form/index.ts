import { useState } from "react";
import { LoginFormData, LoginFormErrors } from "../../_types";

export function useLoginForm() {
    const [formData, setFormData] = useState<LoginFormData>({
        email: "",
        password: ""
    });

    const [errors, setErrors] = useState<LoginFormErrors>({
        email: false,
        password: false
    });

    const handleBlur = (field: keyof LoginFormData) => {
        if (!formData[field].trim()) {
            setErrors(prev => ({ ...prev, [field]: true }));
        }
    };

    const handleChange = (field: keyof LoginFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (value.trim()) {
            setErrors(prev => ({ ...prev, [field]: false }));
        }
    };

    return {
        formData,
        errors,
        handleBlur,
        handleChange
    };
}
