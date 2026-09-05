/**
 * Safely parses raw content into an object even if provided as stringified JSON.
 */
export function parseQuestionContent(rawContent: unknown): Record<string, any> {
    if (!rawContent) return {};
    if (typeof rawContent === 'string') {
        try {
            return JSON.parse(rawContent);
        } catch {
            return { prompt: rawContent };
        }
    }
    if (typeof rawContent === 'object') {
        return rawContent as Record<string, any>;
    }
    return {};
}

/**
 * Extracts question prompt text across standard and fallback property keys.
 */
export function getQuestionPromptText(question: any, content: Record<string, any>): string {
    if (!content && !question) return '';
    const candidates = [
        content?.prompt,
        content?.question,
        content?.text,
        content?.title,
        content?.body,
        content?.promptText,
        content?.questionPrompt,
        content?.question_text,
        question?.prompt,
        question?.question,
        question?.text,
        question?.title,
        question?.body,
        question?.question_text,
        question?.promptText,
        question?.questionPrompt,
    ];

    for (const cand of candidates) {
        if (typeof cand === 'string' && cand.trim().length > 0) {
            return cand.trim();
        }
    }
    return '';
}

/**
 * Extracts passage body and passage title from question or content objects across fallback property keys.
 */
export function extractPassageDetails(
    question: any,
    content: Record<string, any>,
): {
    passage: string | null;
    passageTitle: string | null;
} {
    const rawPassage =
        question?.passageContent ??
        question?.passage_content ??
        content?.passage ??
        content?.passageContent ??
        content?.passage_content ??
        content?.passageText ??
        content?.passage_text ??
        question?.sourceEvidence ??
        question?.source_evidence ??
        content?.sourceEvidence ??
        content?.source_evidence ??
        null;

    const passageBody: string | null =
        typeof rawPassage === 'string' && rawPassage.trim().length > 0
            ? rawPassage.trim()
            : null;

    const rawPassageTitle =
        content?.passageTitle ??
        content?.passage_title ??
        question?.passageTitle ??
        question?.passage_title ??
        content?.passageHeader ??
        content?.passage_header ??
        null;

    const passageTitle: string | null =
        typeof rawPassageTitle === 'string' && rawPassageTitle.trim().length > 0
            ? rawPassageTitle.trim()
            : null;

    return {
        passage: passageBody,
        passageTitle,
    };
}
