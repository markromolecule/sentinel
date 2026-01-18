import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

const port = 3001; // 3001 for the server & 3000 for the web

const app = new Hono()

app.get('/', (c) => {
    return c.text('Sentinel API')
})

serve({
    fetch: app.fetch,
    port
})

console.log(`Server is running on port ${port}`)

export default handle(app)