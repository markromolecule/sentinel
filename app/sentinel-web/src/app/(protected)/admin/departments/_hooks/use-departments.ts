
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Department } from "@sentinel/shared/src/types";
import { DepartmentInput } from "../_types";
import { createSupabaseClient } from "@/data/supabase/client";
import { toast } from "sonner";
import { DEPARTMENT_QUERY_KEYS } from "../_constants";

async function getAuthHeader() {
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No session");
    return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
    };
}

// --- Fetch Departments ---
async function fetchDepartments(): Promise<Department[]> {
    const headers = await getAuthHeader();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments`, {
        headers
    });
    
    if (!response.ok) {
        throw new Error("Failed to fetch departments");
    }

    const json = await response.json();
    return json.data;
}

export function useDepartmentsQuery() {
    return useQuery({
        queryKey: DEPARTMENT_QUERY_KEYS.all,
        queryFn: fetchDepartments
    });
}

// --- Mutations ---
export function useDepartmentMutations() {
    const queryClient = useQueryClient();

    const createDepartment = useMutation({
        mutationFn: async (data: DepartmentInput) => {
            const headers = await getAuthHeader();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments`, {
                method: "POST",
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to create department");
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DEPARTMENT_QUERY_KEYS.all });
            toast.success("Department created successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    const updateDepartment = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: DepartmentInput }) => {
            const headers = await getAuthHeader();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments/${id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to update department");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DEPARTMENT_QUERY_KEYS.all });
            toast.success("Department updated successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    const deleteDepartment = useMutation({
        mutationFn: async (id: string) => {
            const headers = await getAuthHeader();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments/${id}`, {
                method: "DELETE",
                headers
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to delete department");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: DEPARTMENT_QUERY_KEYS.all });
            toast.success("Department deleted successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        }
    });

    return {
        createDepartment,
        updateDepartment,
        deleteDepartment
    };
}
