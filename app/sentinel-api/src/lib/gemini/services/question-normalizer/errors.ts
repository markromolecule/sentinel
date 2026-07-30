/**
 * Base error class for all question normalization failures.
 * Used to decouple business logic from framework-specific (Hono) errors.
 */
export class QuestionNormalizationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'QuestionNormalizationError';
    }
}

/**
 * Thrown when the generated question type is invalid or disallowed.
 */
export class InvalidQuestionTypeError extends QuestionNormalizationError {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidQuestionTypeError';
    }
}

/**
 * Thrown when the generated source metadata (file, page, evidence)
 * cannot be validated against the source documents.
 */
export class SourceMetadataValidationError extends QuestionNormalizationError {
    constructor(message: string) {
        super(message);
        this.name = 'SourceMetadataValidationError';
    }
}

/**
 * Thrown when the generated passage fails deterministic or semantic quality validation.
 */
export class PassageQualityValidationError extends QuestionNormalizationError {
    public readonly slotId?: string;
    public readonly type?: string;
    public readonly violations?: Array<{ code: string; message: string }>;

    constructor(
        message: string,
        details?: {
            slotId?: string;
            type?: string;
            violations?: Array<{ code: string; message: string }>;
        },
    ) {
        super(message);
        this.name = 'PassageQualityValidationError';
        this.slotId = details?.slotId;
        this.type = details?.type;
        this.violations = details?.violations;
    }
}
