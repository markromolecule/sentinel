/**
 * Normalizes question type into standard uppercase format.
 */
export function normalizeQuestionType(type?: string): string {
    return String(type || 'MULTIPLE_CHOICE').toUpperCase();
}

/**
 * Returns a display letter pill for multiple choice options (e.g. "A.", "B.").
 */
export function getOptionLetter(optionId: string, index: number): string {
    if (/^[A-Z]$/i.test(optionId)) {
        return `${optionId.toUpperCase()}.`;
    }
    return `${String.fromCharCode(65 + index)}.`;
}

/**
 * Derives current text value from prop for text-based questions (uncontrolled TextInput).
 */
export function resolveTextValue(selectedOptionId: any): string {
    if (typeof selectedOptionId === 'string') {
        return selectedOptionId;
    }
    if (typeof selectedOptionId === 'number' || typeof selectedOptionId === 'boolean') {
        return String(selectedOptionId);
    }
    return '';
}

/**
 * Resolves single-select ID from raw selectedOptionId.
 */
export function resolveSelectedSingleId(selectedOptionId: any): string | undefined {
    if (typeof selectedOptionId === 'string') {
        return selectedOptionId;
    }
    if (typeof selectedOptionId === 'boolean') {
        return String(selectedOptionId);
    }
    return undefined;
}

/**
 * Resolves multi-select array IDs.
 */
export function resolveSelectedIds(selectedOptionId: any): string[] {
    return Array.isArray(selectedOptionId) ? selectedOptionId : [];
}

/**
 * Values map for MATCHING questions.
 */
export function resolveMatchingValues(selectedOptionId: any): Record<string, string> {
    if (typeof selectedOptionId === 'object' && selectedOptionId !== null && !Array.isArray(selectedOptionId)) {
        return selectedOptionId as Record<string, string>;
    }
    return {};
}

/**
 * Values list for FILL_BLANK and ENUMERATION questions.
 */
export function resolveBlankValues(selectedOptionId: any): string[] {
    return Array.isArray(selectedOptionId)
        ? selectedOptionId.map((item) => String(item ?? ''))
        : [];
}
