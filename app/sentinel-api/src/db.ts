import { PrismaClient } from '../generated/prisma'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createClient> | undefined
}

const createClient = () => {
    return new PrismaClient({
        log: ['error', 'warn'],
        accelerateUrl: process.env.DATABASE_URL
    }).$extends(withAccelerate())
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}