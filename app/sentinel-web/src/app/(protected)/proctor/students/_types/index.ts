import { Student } from "@/app/(protected)/proctor/_types";

export type ParsedStudent = {
    studentNo: string;
    firstName: string;
    lastName: string;
    section: string;
    subject: string;
    term: string;
};

export type ParseResult = {
    students: ParsedStudent[];
    errors: string[];
};


export type StudentsPageHeaderProps = {
    onAddClick: () => void;
};

export type StudentsSearchProps = {
    searchQuery: string;
    onSearchChange: (value: string) => void;
};

export type StudentsTableProps = {
    students: Student[];
};

export type StudentsEmptyStateProps = {
    isSearching: boolean;
    onAddClick: () => void;
};
