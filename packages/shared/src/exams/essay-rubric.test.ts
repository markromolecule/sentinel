import { describe, expect, it } from 'vitest';
import { calculateEssayWeightedScore, evaluateEssayWithRubric, ESSAY_RUBRIC_CRITERIA } from './essay-rubric';

describe('Essay Rubric Weighted Score Calculation', () => {
    it('calculates the maximum possible points if all criteria are 4', () => {
        const scores = {
            contentSubstance: 4,
            structureOrganization: 4,
            argumentationSupport: 4,
            styleTone: 4,
            grammarConventions: 4,
        };

        const maxPoints = 15;
        const result = calculateEssayWeightedScore(scores, maxPoints);
        expect(result).toBe(maxPoints);
    });

    it('calculates 0 if all criteria are 0', () => {
        const scores = {
            contentSubstance: 0,
            structureOrganization: 0,
            argumentationSupport: 0,
            styleTone: 0,
            grammarConventions: 0,
        };

        const maxPoints = 10;
        const result = calculateEssayWeightedScore(scores, maxPoints);
        expect(result).toBe(0);
    });

    it('calculates custom weighted scores and rounds to 2 decimal places', () => {
        // Content: 3 * 0.3 = 0.9
        // Structure: 2 * 0.2 = 0.4
        // Argumentation: 4 * 0.2 = 0.8
        // Style: 3 * 0.15 = 0.45
        // Grammar: 2 * 0.15 = 0.3
        // Total Weighted Sum = 0.9 + 0.4 + 0.8 + 0.45 + 0.3 = 2.85
        // Normalized = 2.85 / 4 = 0.7125
        // Scaled score for 10 max points = 7.125
        // Rounds to 7.13
        const scores = {
            contentSubstance: 3,
            structureOrganization: 2,
            argumentationSupport: 4,
            styleTone: 3,
            grammarConventions: 2,
        };

        const maxPoints = 10;
        const result = calculateEssayWeightedScore(scores, maxPoints);
        expect(result).toBe(7.13);
    });

    it('defaults missing criteria to 0', () => {
        // Content: 4 * 0.3 = 1.2
        // All others missing: 0
        // Total Weighted Sum = 1.2
        // Normalized = 1.2 / 4 = 0.3
        // Scaled score for 5 max points = 1.5
        const scores = {
            contentSubstance: 4,
        };

        const maxPoints = 5;
        const result = calculateEssayWeightedScore(scores, maxPoints);
        expect(result).toBe(1.5);
    });

    it('contains all 5 expected criteria keys and weights summing to 1', () => {
        expect(ESSAY_RUBRIC_CRITERIA).toHaveLength(5);
        const totalWeight = ESSAY_RUBRIC_CRITERIA.reduce((sum, c) => sum + c.weight, 0);
        expect(totalWeight).toBeCloseTo(1.0);
    });

    it('calculates score with custom rubric criteria', () => {
        const customRubric = {
            criteria: [
                {
                    key: 'creativity',
                    name: 'Creativity',
                    weight: 0.6,
                    description: 'Creative elements.',
                    levels: { 0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e' },
                },
                {
                    key: 'logic',
                    name: 'Logic',
                    weight: 0.4,
                    description: 'Logical arguments.',
                    levels: { 0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e' },
                },
            ],
        };

        const scores = { creativity: 3, logic: 4 };
        const result = calculateEssayWeightedScore(scores, 20, customRubric);
        expect(result).toBe(17);
    });

    it('ignores unknown score keys and uses 0 for missing rubric keys', () => {
        const customRubric = {
            criteria: [
                {
                    key: 'creativity',
                    name: 'Creativity',
                    weight: 1.0,
                    description: 'Creative elements.',
                    levels: { 0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e' },
                },
            ],
        };

        const scores = { unknownKey: 4 };
        const result = calculateEssayWeightedScore(scores, 10, customRubric);
        expect(result).toBe(0);
    });
});

describe('evaluateEssayWithRubric', () => {
    it('returns score 0 across all criteria for empty, null, or whitespace answers', () => {
        const emptyResult = evaluateEssayWithRubric('');
        expect(emptyResult.scores.contentSubstance).toBe(0);
        expect(emptyResult.scores.structureOrganization).toBe(0);
        expect(emptyResult.scores.argumentationSupport).toBe(0);
        expect(emptyResult.scores.styleTone).toBe(0);
        expect(emptyResult.scores.grammarConventions).toBe(0);
        expect(emptyResult.feedback).toMatch(/No substantive response submitted/i);

        const nullResult = evaluateEssayWithRubric(null);
        expect(nullResult.scores.contentSubstance).toBe(0);

        const whitespaceResult = evaluateEssayWithRubric('   \n  \t ');
        expect(whitespaceResult.scores.contentSubstance).toBe(0);
    });

    it('returns score 0 for responses under 15 words', () => {
        const short = evaluateEssayWithRubric('This answer is too short to evaluate properly.');
        expect(short.scores.contentSubstance).toBe(0);
        expect(short.feedback).toMatch(/insufficient in length/i);
    });

    it('clamps scores to level 0-1 for responses between 15 and 30 words', () => {
        const text = 'Polymorphism allows objects of different classes to be treated as objects of a common superclass. This is useful for code reuse and dynamic method dispatch in object-oriented systems.';
        const result = evaluateEssayWithRubric(text, 'Explain polymorphism in object-oriented programming.');
        for (const score of Object.values(result.scores)) {
            expect(score).toBeLessThanOrEqual(1);
        }
    });

    it('evaluates a substantive, structured essay to high rubric scores', () => {
        const substantiveEssay = `
            Polymorphism is a fundamental paradigm in modern software engineering that enables unified interfaces for diverse data types.
            Specifically, runtime polymorphism allows a subclass to override superclass methods, facilitating dynamic dispatch and clean decoupling of concerns.

            Furthermore, polymorphism substantially enhances architectural maintainability. For example, in a payment processing pipeline, an abstract
            PaymentMethod class can define an executeTransaction contract. Concrete subclasses such as CreditCardPayment and CryptoPayment implement their
            unique execution protocols without requiring changes to the core checkout controller. Consequently, this design pattern adheres to the Open/Closed Principle.

            In conclusion, polymorphism promotes extensibility, lowers coupling across module boundaries, and simplifies automated unit testing. Because developers
            can inject polymorphic mock implementations, testing edge cases becomes substantially more reliable and reproducible across enterprise systems.
        `;

        const prompt = 'Discuss polymorphism, its architectural benefits, and provide concrete examples of its application in software design.';
        const result = evaluateEssayWithRubric(substantiveEssay, prompt);

        expect(result.scores.contentSubstance).toBeGreaterThanOrEqual(3);
        expect(result.scores.structureOrganization).toBeGreaterThanOrEqual(3);
        expect(result.scores.argumentationSupport).toBeGreaterThanOrEqual(3);
        expect(result.scores.styleTone).toBeGreaterThanOrEqual(3);
        expect(result.scores.grammarConventions).toBeGreaterThanOrEqual(3);
        expect(result.feedback).toMatch(/words/i);
        expect(result.feedback).toMatch(/paragraphs/i);
    });

    it('evaluates custom rubric definitions with custom criteria keys', () => {
        const customRubric = {
            criteria: [
                {
                    key: 'technicalAccuracy',
                    name: 'Technical Accuracy',
                    weight: 0.5,
                    description: 'Accuracy of engineering details.',
                    levels: { 0: 'L0', 1: 'L1', 2: 'L2', 3: 'L3', 4: 'L4' },
                },
                {
                    key: 'codeExamples',
                    name: 'Code Examples',
                    weight: 0.5,
                    description: 'Presence of illustrative examples.',
                    levels: { 0: 'L0', 1: 'L1', 2: 'L2', 3: 'L3', 4: 'L4' },
                },
            ],
        };

        const text = `
            This system design requires careful synchronization to prevent race conditions.
            For instance, using distributed locks with Redis guarantees atomicity across multiple nodes.
            Furthermore, implementing idempotent workers prevents duplicate message processing in Kafka queues.
            Consequently, throughput remains consistent under high concurrent load.
        `;

        const result = evaluateEssayWithRubric(text, 'Describe concurrent system design.', customRubric);

        expect(result.scores).toHaveProperty('technicalAccuracy');
        expect(result.scores).toHaveProperty('codeExamples');
        expect(result.scores.technicalAccuracy).toBeGreaterThanOrEqual(2);
        expect(result.scores.codeExamples).toBeGreaterThanOrEqual(2);
    });

    it('grants grammarConventions >= 2 for a substantive essay with imperfect capitalization (ESL scenario)', () => {
        // Simulates an ESL student: ideas are on-topic and substantive, but sentence
        // starts are inconsistently capitalized — a common pattern for non-native writers.
        // Essay is intentionally >110 words so contentSubstance can reach L3.
        const eslEssay = [
            'photosynthesis is the process by which plants convert sunlight into chemical energy.',
            'specifically, plants absorb carbon dioxide from the air and water from the soil.',
            'using chlorophyll in their leaves, they capture light energy and convert it into glucose.',
            'this glucose provides energy for growth, reproduction, and all cellular processes.',
            'furthermore, oxygen is released as a byproduct, which is essential for most living organisms on earth.',
            'the light-dependent reactions occur in the thylakoid membrane and produce atp and nadph.',
            'subsequently, the light-independent reactions, also known as the calvin cycle, use these molecules to fix carbon.',
            'in conclusion, photosynthesis is a fundamental biological process that sustains life on earth.',
            'it connects the sun, atmosphere, and biosphere in a continuous cycle of energy transfer.',
        ].join(' ');

        const result = evaluateEssayWithRubric(
            eslEssay,
            'Explain the process of photosynthesis and its importance.',
        );

        // Content should be >= 3 (substantive, on-topic, adequate length > 110 words)
        expect(result.scores.contentSubstance).toBeGreaterThanOrEqual(3);
        // Grammar compensation: despite low capitalizationRatio, content strength floors it to >= 2
        expect(result.scores.grammarConventions).toBeGreaterThanOrEqual(2);
        // Overall feedback should not be "developing"
        expect(result.feedback).not.toMatch(/developing response/i);
    });

    it('grants styleTone >= 3 for a formal essay with short sentences (non-native sentence style)', () => {
        // Simulates a student who writes in short, clear, formal sentences — common in
        // Mandarin/Japanese/Korean L2 writers. No informal language is present.
        const shortSentenceEssay = [
            'Climate change is a global challenge. It affects all countries. The main cause is fossil fuel use.',
            'Burning coal releases carbon dioxide. This gas traps heat in the atmosphere.',
            'Temperatures rise. Ice caps melt. Sea levels increase.',
            'Governments must act. Renewable energy is one solution. Solar and wind power help reduce emissions.',
            'Furthermore, individuals can reduce their carbon footprint. Small actions collectively matter.',
            'In conclusion, urgent cooperation is required to address climate change effectively.',
        ].join(' ');

        const result = evaluateEssayWithRubric(
            shortSentenceEssay,
            'Discuss the causes and solutions of climate change.',
        );

        // Short sentences should not prevent a formal-tone score of 3+
        expect(result.scores.styleTone).toBeGreaterThanOrEqual(3);
        // Should still recognize structural elements
        expect(result.scores.structureOrganization).toBeGreaterThanOrEqual(2);
    });

    it('does NOT compensate form criteria when content is weak (short, off-topic)', () => {
        // A short, off-topic, and poorly structured answer should not receive
        // any compensation — compensation only applies when content is strong.
        const weakAnswer = 'i think its good. photosynthesis happens. plants need sun. thats all i know about it.';

        const result = evaluateEssayWithRubric(
            weakAnswer,
            'Explain the detailed molecular mechanisms of photosynthesis.',
        );

        // Score should be low across all criteria — no artificial inflation
        expect(result.scores.contentSubstance).toBeLessThanOrEqual(2);
        // Content is below 120-word compensation threshold, so grammar stays at its raw value (1–2)
        expect(result.scores.grammarConventions).toBeLessThanOrEqual(2);
    });

    it('generates per-criterion feedback hints for a mid-quality essay', () => {
        // Essay is intentionally > 50 words so contentSubstance reaches at least L2
        const midQualityEssay = [
            'The internet has fundamentally changed human communication and information access worldwide.',
            'People can now send messages instantly across continents using social media and messaging apps.',
            'Social media platforms connect billions of users, enabling global collaboration and awareness.',
            'However, there are also significant negative effects associated with widespread internet use.',
            'Misinformation spreads quickly online, sometimes causing social division and public confusion.',
            'In conclusion, the internet has both positive and negative impacts on modern society.',
        ].join(' ');

        const result = evaluateEssayWithRubric(
            midQualityEssay,
            'Discuss the impact of the internet on modern society.',
        );

        // Feedback should contain the metadata footer
        expect(result.feedback).toMatch(/word/i);
        expect(result.feedback).toMatch(/paragraph/i);
        // Scores should be >= 2 for a mid-quality essay with sufficient length
        expect(result.scores.contentSubstance).toBeGreaterThanOrEqual(2);
    });
});
