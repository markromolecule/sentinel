import { describe, expect, it, vi } from 'vitest';
import { type DbClient } from '@sentinel/db';
import { getLobbyCount } from './get-lobby-count';

describe('getLobbyCount', () => {
    it('counts waiting and approved lobby admissions that have not entered an active attempt or submitted', async () => {
        const countBuilder = {
            leftJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({ count: '2' }),
        };
        const dbClient = {
            selectFrom: vi.fn().mockReturnValue(countBuilder),
        } as unknown as DbClient;

        const result = await getLobbyCount(dbClient, 'exam-1');

        expect(result).toEqual({ count: 2 });
        expect(dbClient.selectFrom).toHaveBeenCalledWith('exam_lobby_admissions as ela');
        expect(countBuilder.where).toHaveBeenCalledWith('ela.exam_id', '=', 'exam-1');
        expect(countBuilder.where).toHaveBeenCalledWith('ela.status', 'in', [
            'WAITING',
            'APPROVED',
        ]);
        expect(countBuilder.where).toHaveBeenCalledWith('ea_completed.attempt_id', 'is', null);
    });

    it('returns zero when the count query yields no row', async () => {
        const countBuilder = {
            leftJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue(undefined),
        };
        const dbClient = {
            selectFrom: vi.fn().mockReturnValue(countBuilder),
        } as unknown as DbClient;

        const result = await getLobbyCount(dbClient, 'exam-1');

        expect(result).toEqual({ count: 0 });
    });
});
