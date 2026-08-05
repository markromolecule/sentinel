import { describe, expect, it } from 'vitest';
import { mapNormalizedLandmarksToMediaPipeLandmarks } from './_utils';

describe('mapNormalizedLandmarksToMediaPipeLandmarks', () => {
    it('normalizes mobile landmark precision without changing face count', () => {
        expect(
            mapNormalizedLandmarksToMediaPipeLandmarks([
                [
                    { x: 0.123456, y: 0.654321, z: 0.333339 },
                    { x: 0.999994, y: 0.000006, z: -0.111119 },
                ],
            ]),
        ).toEqual([
            [
                { x: 0.1235, y: 0.6543, z: 0.3333 },
                { x: 1, y: 0, z: -0.1111 },
            ],
        ]);
    });
});
