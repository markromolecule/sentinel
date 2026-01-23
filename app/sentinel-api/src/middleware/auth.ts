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

        // attach user to context
        c.set('user', dbUser)
        c.set('supabaseUser', user)

    } catch (dbError) {
        console.error('Database Sync Error:', dbError)
        throw new HTTPException(500, { message: 'Database Connection Error' })
    }

    await next()
}
