
import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
import { OnboardingService } from './onboarding.service'
import { users as User } from '../../../generated/prisma'
import { ApiResponse, Department, Institution, Student } from '@sentinel/shared'

type Variables = {
    user: User
}

const onboarding = new Hono<{ Variables: Variables }>()

onboarding.post('/', authMiddleware, async (c) => {
    try {
        const body = await c.req.json()
        const user = c.get('user')

        const { studentNumber, institutionId, departmentId } = body

        if (!studentNumber || !institutionId) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        const student = await OnboardingService.createStudent(user.id, {
            studentNumber,
            institutionId,
            departmentId
        })

        return c.json<ApiResponse<Student>>({
            message: 'Student profile created successfully',
            data: student as unknown as Student
        })
    } catch (error: any) {
        console.error('Onboarding error:', error)
        return c.json<ApiResponse<Student>>({ error: error.message || 'Internal Server Error' }, 500)
    }
})

onboarding.get('/departments', authMiddleware, async (c) => {
    try {
        const rawDepartments = await OnboardingService.getDepartments()
        
        const departments: Department[] = rawDepartments.map(dept => ({
            id: dept.department_id,
            name: dept.department_name,
            code: dept.department_code,
            createdAt: dept.created_at,
            createdBy: dept.created_by
        }))

        return c.json<ApiResponse<Department[]>>({
            message: 'Departments fetched successfully',
            data: departments
        })
    } catch (error: any) {
        console.error('Fetch departments error:', error)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

onboarding.get('/institution', authMiddleware, async (c) => {
    try {
        const institution = await OnboardingService.getDefaultInstitution()

        if (!institution) {
            return c.json({ error: 'Default institution not found' }, 404)
        }

        return c.json<ApiResponse<Institution>>({
            message: 'Institution fetched successfully',
            data: institution as unknown as Institution
        })
    } catch (error: any) {
        console.error('Fetch institution error:', error)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

export default onboarding
