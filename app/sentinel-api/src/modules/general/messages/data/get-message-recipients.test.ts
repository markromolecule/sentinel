import { describe, expect, it, vi } from 'vitest';
import { getMessageRecipientsData } from './get-message-recipients';

type FakeBuilderResult = {
    execute?: any[];
    executeTakeFirst?: any;
};

function createFakeBuilder(result: FakeBuilderResult) {
    const builder = {
        leftJoin() {
            return this;
        },
        innerJoin() {
            return this;
        },
        select() {
            return this;
        },
        where: vi.fn().mockImplementation(function (this: any) {
            return this;
        }),
        whereRef() {
            return this;
        },
        orderBy() {
            return this;
        },

        limit() {
            return this;
        },
        async execute() {
            return result.execute ?? [];
        },
        async executeTakeFirst() {
            return result.executeTakeFirst;
        },
    };
    return builder;
}

function createFakeDbClient(result: FakeBuilderResult) {
    const builder = createFakeBuilder(result);
    return {
        selectFrom: vi.fn(() => builder),
    } as any;
}


describe('getMessageRecipientsData', () => {
    it('returns messageable recipients with mapped default student role', async () => {
        const dbClient = createFakeDbClient({
            execute: [
                {
                    userId: 'user-1',
                    name: 'Alice Student',
                    avatarUrl: 'https://example.com/alice.png',
                    status: 'ACTIVE',
                    role: null,
                    institution: { id: 'inst-1', name: 'Sentinel Academy' },
                },
                {
                    userId: 'user-2',
                    name: 'Bob Instructor',
                    avatarUrl: null,
                    status: 'ACTIVE',
                    role: 'instructor',
                    institution: { id: 'inst-1', name: 'Sentinel Academy' },
                },
            ],
        });


        const result = await getMessageRecipientsData(dbClient, {
            requesterUserId: 'requester-1',
            institutionId: 'inst-1',
            search: 'Ali',
            limit: 20,
            isRequesterStudent: true,
        });

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            userId: 'user-1',
            name: 'Alice Student',
            avatarUrl: 'https://example.com/alice.png',
            status: 'ACTIVE',
            role: 'student', // Fallback applied
            institution: { id: 'inst-1', name: 'Sentinel Academy' },
        });
        expect(result[1]).toEqual({
            userId: 'user-2',
            name: 'Bob Instructor',
            avatarUrl: null,
            status: 'ACTIVE',
            role: 'instructor',
            institution: { id: 'inst-1', name: 'Sentinel Academy' },
        });
    });
});
