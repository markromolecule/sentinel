import { handle } from 'hono/vercel'
import app from '../src/app'

// Vercel Serverless Function - Named exports required
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)
export const OPTIONS = handle(app)
