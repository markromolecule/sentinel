export interface Student {
    student_id: string;
    user_id: string;
    student_number: string;
    department_id?: string | null;
    institution_id?: string | null;
}

export interface Department {
    department_id: string;
    department_name: string;
    department_code?: string | null;
}

export interface Institution {
    id: string;
    name: string;
    code?: string | null;
}

// API Response Wrappers
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}