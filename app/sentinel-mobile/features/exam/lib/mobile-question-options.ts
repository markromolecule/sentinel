/**
 * Derives rendered option rows for MULTIPLE_CHOICE and MULTIPLE_RESPONSE
 * questions from the raw content, supporting both string arrays and object arrays.
 */
export function getChoiceOptions(
    content: Record<string, any>,
    question?: any,
): { id: string; text: string }[] {
    const rawOptions =
        content?.options ??
        content?.choices ??
        content?.items ??
        content?.answers ??
        content?.optionTokens ??
        content?.option_list ??
        question?.options ??
        question?.choices ??
        question?.items ??
        question?.answers;

    if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
        return [];
    }

    return rawOptions.map((opt, index) => {
        const defaultId = String.fromCharCode(65 + index); // 'A', 'B', 'C', ...
        if (typeof opt === 'string' || typeof opt === 'number') {
            return {
                id: defaultId,
                text: String(opt),
            };
        }
        if (opt && typeof opt === 'object') {
            const text =
                opt.text ??
                opt.label ??
                opt.value ??
                opt.prompt ??
                opt.option_text ??
                opt.optionText ??
                opt.choice ??
                String(opt);
            const id = opt.id ?? opt.key ?? defaultId;
            return {
                id: String(id),
                text: String(text),
            };
        }
        return {
            id: defaultId,
            text: String(opt),
        };
    });
}

/**
 * Derives the TRUE_FALSE option rows (always "True" then "False").
 */
export function getTrueFalseOptions(): { id: string; text: string }[] {
    return [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
    ];
}
