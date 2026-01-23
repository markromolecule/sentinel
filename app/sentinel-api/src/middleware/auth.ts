import { createClient } from '@supabase/supabase-js'
import { Context, Next } from 'hono'
import { prisma } from '../lib/db'
import { HTTPException } from 'hono/http-exception'

// initialize supabase
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader) {
        throw new HTTPException(401, { message: 'missing auth token' })
    }
    const token = authHeader.replace('bearer ', '')
    // verify token with supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user || !user.email) {
        console.error('auth error:', error)
        throw new HTTPException(401, { message: 'invalid or expired token' })
    }

    // sync with prisma
    try {
        // Use user.id which is the Primary Key. Email is not unique in Prisma's view of auth.users
        const dbUser = await prisma.users.findUnique({
            where: { id: user.id },
            include: {
                user_profiles: true // Include profile data if needed
            }
        })

        // Note: we do NOT create users here because auth.users is managed by Supabase Auth.
        // Also user_profiles are created by Database Triggers.

        if (!dbUser) {
            // Highly unlikely if supabase.auth.getUser succeeded, unless replication lag or manual deletion
            console.error(`User ${user.id} found in Auth but not in DB (auth.users)`)
            throw new HTTPException(500, { message: 'User data consistency error' })
        }

        // attach user to context
        c.set('user', dbUser)
        c.set('supabaseUser', user)

    } catch (dbError) {
        // recheck if it's the 500 thrown above
        if (dbError instanceof HTTPException) throw dbError

        console.error('Database Sync Error:', dbError)
        throw new HTTPException(500, { message: 'Database Connection Error' })
    }

    await next()
}
