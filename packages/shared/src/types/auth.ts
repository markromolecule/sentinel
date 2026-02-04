// Login 
export interface LoginFormData {
    email: string;
    password: string;
}

export interface LoginFormErrors {
    email: boolean;
    password: boolean;
}

// Register
export interface RegisterFormData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface RegisterFormErrors {
    firstName: boolean;
    lastName: boolean;
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
}
