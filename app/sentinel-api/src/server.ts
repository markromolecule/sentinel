import 'dotenv/config'
import { serve } from '@hono/node-server'
import app from './app'

const port = 3001; // 3001 for the server & 3000 for the web

serve({
    fetch: app.fetch,
    port
})

console.log(`Server is running on port ${port}`)