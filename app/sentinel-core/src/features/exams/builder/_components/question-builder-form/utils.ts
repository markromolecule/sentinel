import { htmlToPlainText } from '@sentinel/ui';
import type { PassageType } from '@sentinel/shared/types';
import type { QuestionBuilderPayload } from '../_types';

type PassagePayloadInput = Pick<QuestionBuilderPayload, 'passageContent' | 'passageType'>;

export function normalizePassagePayload({
    passageContent,
    passageType,
}: PassagePayloadInput): Required<PassagePayloadInput> {
    const passageTextContent = htmlToPlainText(passageContent ?? '').trim();
    const normalizedPassageContent =
        passageType === 'html'
            ? passageTextContent.length > 0
                ? (passageContent ?? null)
                : null
            : passageContent?.trim()
              ? passageContent
              : null;

    return {
        passageContent: normalizedPassageContent,
        passageType: normalizedPassageContent ? (passageType ?? 'plain') : 'plain',
    };
}

export function hasPassageContent(passageType: PassageType, passageContent: string): boolean {
    return passageType === 'html'
        ? htmlToPlainText(passageContent).trim().length > 0
        : passageContent.trim().length > 0;
}
