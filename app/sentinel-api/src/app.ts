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

// CORS configuration
app.use('/*', cors({
    origin: (origin) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'https://sentinel-coral.vercel.app',
            'https://app.sentinel-ph.com',
            'https://app.sentinelph.tech',
            'https://sentinelph.tech',
            'https://www.sentinelph.tech'
        ]
        // Allow Vercel preview deployments
        if (origin && origin.endsWith('.vercel.app')) {
            return origin
        }
        if (allowedOrigins.includes(origin)) {
            return origin
        }
        return allowedOrigins[0]
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}))

// Routes
app.get('/', (c) => {
    return c.text('Sentinel API')
})

app.get('/me', authMiddleware, (c) => {
    const user = c.get('user')
    return c.json({
        message: 'You are authenticated',
        user
    })
})

// Export the app instance (used by both server.ts and api/index.ts)
export default app