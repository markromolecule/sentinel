
import { prisma } from '../../lib/db'

export class OnboardingService {
    static async createStudent(userId: string, studentData: { studentNumber: string; institutionId: string; departmentId?: string }) {
        try {
            // Check if user exists
            const user = await prisma.users.findUnique({
                where: { id: userId }
            })

            if (!user) {
                throw new Error('User not found')
            }

            // Check if student record already exists
            const existingStudent = await prisma.students.findUnique({
                where: { user_id: userId }
            })

            if (existingStudent) {
                throw new Error('Student profile already exists')
            }   

            // Create student record
            const newStudent = await prisma.students.create({
                data: {
                    user_id: userId,
                    student_number: studentData.studentNumber,
                    institution_id: studentData.institutionId,
                    department_id: studentData.departmentId
                }
            })

            return newStudent
        } catch (error) {
            throw error
        }
    }

    static async getDepartments() {
        try {
            const departments = await prisma.departments.findMany({
                orderBy: { department_name: 'asc' }
            })
            return departments
        } catch (error) {
            throw error
        }
    }

    static async getDefaultInstitution() {
        try {
            const institution = await prisma.institutions.findUnique({
                where: { name: 'NU DASMARIÑAS' }
            })
            return institution
        } catch (error) {
            throw error
        }
    }
}
