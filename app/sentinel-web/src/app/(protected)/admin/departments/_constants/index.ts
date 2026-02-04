
export const DEPARTMENT_QUERY_KEYS = {
    all: ["departments"] as const,
    details: (id: string) => ["departments", id] as const,
};
