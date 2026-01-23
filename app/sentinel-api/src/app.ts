import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { users as User } from '../generated/prisma'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { authMiddleware } from './middleware/auth'

type Variables = {
    user: User
    supabaseUser: SupabaseUser
}

const app = new Hono<{ Variables: Variables }>()

app.use('/*', cors({
    origin: (origin) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'https://sentinel-coral.vercel.app',
        ]
        // Also allow Vercel preview deployments (optional, good for PRs)
        if (origin && origin.endsWith('.vercel.app')) {
            return origin
        }
        if (allowedOrigins.includes(origin)) {
            return origin
        }
        return allowedOrigins[0] // Default fallback
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}))


app.get('/', (c) => {
    return c.text('Sentinel API')
})

// Protected Route Example
app.get('/me', authMiddleware, (c) => {
    const user = c.get('user')
    return c.json({
        message: 'You are authenticated',
        user
    })
})

export default app
