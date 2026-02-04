
import { Hono } from 'hono'
import { authMiddleware } from '../../middleware/auth'
import { users as User } from '../../../generated/prisma'
import { ApiResponse, Department } from '@sentinel/shared'
import { DepartmentService } from './departments.service'

type Variables = {
    user: User
}

const departments = new Hono<{ Variables: Variables }>()

departments.use('*', authMiddleware)

departments.get('/', async (c) => {
    try {
        const rawDepartments = await DepartmentService.getDepartments()
        
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

departments.post('/', async (c) => {
    try {
        const body = await c.req.json()
        const user = c.get('user')
        const { name, code } = body

        if (!name) {
            return c.json({ error: 'Department name is required' }, 400)
        }

        const rawDepartment = await DepartmentService.createDepartment({
            name, 
            code,
            createdBy: user.id
        })

        const department: Department = {
            id: rawDepartment.department_id,
            name: rawDepartment.department_name,
            code: rawDepartment.department_code,
            createdAt: rawDepartment.created_at,
            createdBy: rawDepartment.created_by
        }

        return c.json<ApiResponse<Department>>({
            message: 'Department created successfully',
            data: department
        })
    } catch (error: any) {
        console.error('Create department error:', error)
        if (error.code === 'P2002') {
             return c.json({ error: 'Department name already exists' }, 409)
        }
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

departments.put('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        const body = await c.req.json()
        const { name, code } = body

        const rawDepartment = await DepartmentService.updateDepartment(id, { name, code })

        const department: Department = {
            id: rawDepartment.department_id,
            name: rawDepartment.department_name,
            code: rawDepartment.department_code,
            createdAt: rawDepartment.created_at,
            createdBy: rawDepartment.created_by
        }

        return c.json<ApiResponse<Department>>({
            message: 'Department updated successfully',
            data: department
        })
    } catch (error: any) {
        console.error('Update department error:', error)
        if (error.code === 'P2002') {
             return c.json({ error: 'Department name already exists' }, 409)
        }
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

departments.delete('/:id', async (c) => {
    try {
        const id = c.req.param('id')
        await DepartmentService.deleteDepartment(id)

        return c.json<ApiResponse<null>>({
            message: 'Department deleted successfully',
            data: null
        })
    } catch (error: any) {
        console.error('Delete department error:', error)
         if (error.code === 'P2003') {
             return c.json({ error: 'Cannot delete department because it is being used.' }, 409)
        }
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

export default departments
