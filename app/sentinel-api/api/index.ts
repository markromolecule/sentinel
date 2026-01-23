import { handle } from 'hono/vercel'
import app from '../src/app'

// Use edge runtime for better performance on Vercel
export const config = {
    runtime: 'edge',
}

// Vercel handler - wraps the Hono app
export default handle(app)
