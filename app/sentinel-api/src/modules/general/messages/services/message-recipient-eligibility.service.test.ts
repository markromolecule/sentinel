import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    listEligibleMessageRecipients,
    assertEligibleDirectMessageRecipient,
} from './message-recipient-eligibility.service';
import * as getRecipientsDataModule from '../data/get-message-recipients';
import { HTTPException } from 'hono/http-exception';

type FakeBuilderResult = {
    execute?: any[];
    executeTakeFirst?: any;
};

function createFakeBuilder(result: FakeBuilderResult) {
    return {
        selectFrom() {
            return this;
        },
        leftJoin() {
            return this;
        },
        innerJoin() {
            return this;
        },
        select() {
            return this;
        },
        where() {
            return this;
        },
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
}

function createFakeDbClient(result: FakeBuilderResult) {
    const builder = createFakeBuilder(result);
    return {
        selectFrom: vi.fn(() => builder),
    } as any;
}

describe('message-recipient-eligibility.service', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('listEligibleMessageRecipients', () => {
        it('calls getMessageRecipientsData with isRequesterStudent: true for student requester', async () => {
            const dbClient = createFakeDbClient({
                executeTakeFirst: { roleName: 'student' },
            });

            const spy = vi
                .spyOn(getRecipientsDataModule, 'getMessageRecipientsData')
                .mockResolvedValue([]);

            const result = await listEligibleMessageRecipients(dbClient, {
                requesterUserId: 'student-1',
                institutionId: 'inst-1',
                search: 'Alice',
                limit: 10,
            });

            expect(result).toEqual([]);
            expect(spy).toHaveBeenCalledWith(
                dbClient,
                expect.objectContaining({
                    requesterUserId: 'student-1',
                    institutionId: 'inst-1',
                    search: 'Alice',
                    limit: 10,
                    isRequesterStudent: true,
                }),
            );
        });

        it('calls getMessageRecipientsData with isRequesterStudent: false for non-student requester', async () => {
            const dbClient = createFakeDbClient({
                executeTakeFirst: { roleName: 'instructor' },
            });

            const spy = vi
                .spyOn(getRecipientsDataModule, 'getMessageRecipientsData')
                .mockResolvedValue([]);

            const result = await listEligibleMessageRecipients(dbClient, {
                requesterUserId: 'instructor-1',
                institutionId: 'inst-1',
                search: 'Alice',
                limit: 10,
            });

            expect(result).toEqual([]);
            expect(spy).toHaveBeenCalledWith(
                dbClient,
                expect.objectContaining({
                    requesterUserId: 'instructor-1',
                    institutionId: 'inst-1',
                    search: 'Alice',
                    limit: 10,
                    isRequesterStudent: false,
                }),
            );
        });
    });

    describe('assertEligibleDirectMessageRecipient', () => {
        it('resolves if requester is a non-student and recipient exists', async () => {
            const dbClient = createFakeDbClient({
                executeTakeFirst: { user_id: 'recipient-1' },
            });

            await expect(
                assertEligibleDirectMessageRecipient(dbClient, {
                    requesterUserId: 'instructor-1',
                    requesterRole: 'instructor',
                    institutionId: 'inst-1',
                    recipientId: 'recipient-1',
                }),
            ).resolves.not.toThrow();
        });

        it('throws 404 if requester is a non-student and recipient does not exist', async () => {
            const dbClient = createFakeDbClient({
                executeTakeFirst: undefined,
            });

            await expect(
                assertEligibleDirectMessageRecipient(dbClient, {
                    requesterUserId: 'instructor-1',
                    requesterRole: 'instructor',
                    institutionId: 'inst-1',
                    recipientId: 'recipient-1',
                }),
            ).rejects.toThrow(HTTPException);
        });

        it('resolves if requester is a student and recipient meets all criteria', async () => {
            const dbClient = createFakeDbClient({
                executeTakeFirst: { userId: 'recipient-1' },
            });

            await expect(
                assertEligibleDirectMessageRecipient(dbClient, {
                    requesterUserId: 'student-1',
                    requesterRole: 'student',
                    institutionId: 'inst-1',
                    recipientId: 'recipient-1',
                }),
            ).resolves.not.toThrow();
        });

        it('throws 404 if requester is a student and recipient does not meet criteria', async () => {
            const dbClient = createFakeDbClient({
                executeTakeFirst: undefined,
            });

            await expect(
                assertEligibleDirectMessageRecipient(dbClient, {
                    requesterUserId: 'student-1',
                    requesterRole: 'student',
                    institutionId: 'inst-1',
                    recipientId: 'recipient-1',
                }),
            ).rejects.toThrow(HTTPException);
        });
    });
});
