import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const port = 3001; // 3001 for the server & 3000 for the web

import { User } from '../generated/prisma'
import { User as SupabaseUser } from '@supabase/supabase-js'

type Variables = {
    user: User
    supabaseUser: SupabaseUser
}

const app = new Hono<{ Variables: Variables }>()

import { cors } from 'hono/cors'

app.use('/*', cors({
    origin: 'http://localhost:3000',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}))


app.get('/', (c) => {
    return c.text('Sentinel API')
})

import { authMiddleware } from './middleware/auth'

// Protected Route Example
app.get('/me', authMiddleware, (c) => {
    const user = c.get('user')
    return c.json({
        message: 'You are authenticated',
        user
    })
})

serve({
    fetch: app.fetch,
    port
})

console.log(`Server is running on port ${port}`)

export default handle(app)