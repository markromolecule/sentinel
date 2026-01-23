import 'dotenv/config'
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'
import { users as User } from '../generated/prisma'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { authMiddleware } from '../src/middleware/auth'

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

// Vercel Serverless Function - Named exports required
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
export const OPTIONS = handle(app)
