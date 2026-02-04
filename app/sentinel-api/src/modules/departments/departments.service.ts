
import { prisma } from '../../lib/db'

export class DepartmentService {
    static async getDepartments() {
        return await prisma.departments.findMany({
            orderBy: {
                department_name: 'asc'
            }
        })
    }

    static async createDepartment(data: { name: string; code?: string; createdBy?: string }) {
        return await prisma.departments.create({
            data: {
                department_name: data.name,
                department_code: data.code,
                created_by: data.createdBy,
                created_at: new Date()
            }
        })
    }

    static async updateDepartment(id: string, data: { name?: string; code?: string }) {
        return await prisma.departments.update({
            where: { department_id: id },
            data: {
                department_name: data.name,
                department_code: data.code
            }
        })
    }

    static async deleteDepartment(id: string) {
        return await prisma.departments.delete({
            where: { department_id: id }
        })
    }
}
