
import { Department } from "@sentinel/shared/src/types";

export type DepartmentStoreState = {
    departments: Department[];
};

export type DepartmentInput = {
    name: string;
    code?: string;
};
