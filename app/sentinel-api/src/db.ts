import { PrismaClient } from '../generated/prisma'

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createClient> | undefined
}

const createClient = () => {
    return new PrismaClient({
        log: ['error', 'warn'],
        accelerateUrl: process.env.DATABASE_URL
    })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}