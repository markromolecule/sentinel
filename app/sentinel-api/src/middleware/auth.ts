import { createClient } from '@supabase/supabase-js'
import { Context, Next } from 'hono'
import { prisma } from '../db'
import { HTTPException } from 'hono/http-exception'

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader) {
        throw new HTTPException(401, { message: 'Missing Authorization Header' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify Token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user || !user.email) {
        console.error('Auth Error:', error)
        throw new HTTPException(401, { message: 'Invalid or Expired Token' })
    }

    // Sync with Prisma (Lazy Sync)
    try {
        let dbUser = await prisma.user.findUnique({
            where: { email: user.email }
        })

        if (!dbUser) {
            console.log(`Creating new user for ${user.email}`)
            dbUser = await prisma.user.create({
                data: {
                    email: user.email,
                    // Map other fields if available in user.user_metadata
                    // name: user.user_metadata.full_name 
                }
            })
        }

        // Attach user to context
        c.set('user', dbUser)
        c.set('supabaseUser', user)

    } catch (dbError) {
        console.error('Database Sync Error:', dbError)
        throw new HTTPException(500, { message: 'Database Connection Error' })
    }

    await next()
}
