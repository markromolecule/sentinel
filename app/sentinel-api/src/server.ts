import 'dotenv/config'
import { serve } from '@hono/node-server'
import app from './app'

const port = 3001

serve({
    fetch: app.fetch,
    port
})

console.log(`Server is running on http://localhost:${port}`)