-- CreateEnum
CREATE TYPE public.essay_rubric_scope AS ENUM ('BASELINE', 'EXAM_OVERRIDE');

-- CreateTable
CREATE TABLE public.essay_rubric_versions (
    rubric_version_id UUID NOT NULL DEFAULT gen_random_uuid(),
    scope public.essay_rubric_scope NOT NULL,
    exam_id UUID,
    version_number INTEGER NOT NULL,
    definition JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    supersedes_version_id UUID,
    created_by UUID,
    created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) WITH TIME ZONE,

    CONSTRAINT essay_rubric_versions_pkey PRIMARY KEY (rubric_version_id),
    CONSTRAINT essay_rubric_versions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(exam_id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT essay_rubric_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT essay_rubric_versions_supersedes_version_id_fkey FOREIGN KEY (supersedes_version_id) REFERENCES public.essay_rubric_versions(rubric_version_id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- baseline version number unique
CREATE UNIQUE INDEX baseline_version_uniq_idx ON public.essay_rubric_versions (version_number) WHERE scope = 'BASELINE';

-- exam override version number unique per exam
CREATE UNIQUE INDEX exam_override_version_uniq_idx ON public.essay_rubric_versions (exam_id, version_number) WHERE scope = 'EXAM_OVERRIDE';

-- active baseline partial index (only one active baseline)
CREATE UNIQUE INDEX active_baseline_idx ON public.essay_rubric_versions (scope) WHERE scope = 'BASELINE' AND is_active = true;

-- active exam override partial index (only one active override per exam)
CREATE UNIQUE INDEX active_exam_override_idx ON public.essay_rubric_versions (exam_id) WHERE scope = 'EXAM_OVERRIDE' AND is_active = true;

-- lookup indexes
CREATE INDEX essay_rubric_versions_exam_id_idx ON public.essay_rubric_versions (exam_id);
CREATE INDEX essay_rubric_versions_scope_idx ON public.essay_rubric_versions (scope);
CREATE INDEX essay_rubric_versions_is_active_idx ON public.essay_rubric_versions (is_active);

-- Seed Initial Active Baseline (legacy-standard-v1)
INSERT INTO public.essay_rubric_versions (rubric_version_id, scope, exam_id, version_number, definition, is_active, created_at)
VALUES (
    'd8c7c945-89db-4845-82df-e12d1b82e2c1',
    'BASELINE',
    NULL,
    1,
    '{
      "criteria": [
        {
          "key": "contentSubstance",
          "name": "Content & Substance",
          "weight": 0.3,
          "description": "Depth of analysis, relevance of content to the prompt, and detail.",
          "levels": {
            "0": "Empty submission or completely unrelated response.",
            "1": "Substandard quality, fails to meet multiple basic requirements, incoherent.",
            "2": "Average quality, meets basic criteria requirements but lacks depth.",
            "3": "High quality, meets all criteria with only minor, negligible flaws.",
            "4": "Exceptional quality, fully meets and exceeds all criteria expectations."
          }
        },
        {
          "key": "structureOrganization",
          "name": "Structure & Organization",
          "weight": 0.2,
          "description": "Clarity of thesis, logical flow, transitions, and paragraph structure.",
          "levels": {
            "0": "Empty submission or completely unrelated response.",
            "1": "Substandard quality, fails to meet multiple basic requirements, incoherent.",
            "2": "Average quality, meets basic criteria requirements but lacks depth.",
            "3": "High quality, meets all criteria with only minor, negligible flaws.",
            "4": "Exceptional quality, fully meets and exceeds all criteria expectations."
          }
        },
        {
          "key": "argumentationSupport",
          "name": "Argumentation & Support",
          "weight": 0.2,
          "description": "Strength of claims, reasoning, and evidence/examples provided.",
          "levels": {
            "0": "Empty submission or completely unrelated response.",
            "1": "Substandard quality, fails to meet multiple basic requirements, incoherent.",
            "2": "Average quality, meets basic criteria requirements but lacks depth.",
            "3": "High quality, meets all criteria with only minor, negligible flaws.",
            "4": "Exceptional quality, fully meets and exceeds all criteria expectations."
          }
        },
        {
          "key": "styleTone",
          "name": "Style & Tone",
          "weight": 0.15,
          "description": "Consistency of formal tone, word choice, and clarity of expression.",
          "levels": {
            "0": "Empty submission or completely unrelated response.",
            "1": "Substandard quality, fails to meet multiple basic requirements, incoherent.",
            "2": "Average quality, meets basic criteria requirements but lacks depth.",
            "3": "High quality, meets all criteria with only minor, negligible flaws.",
            "4": "Exceptional quality, fully meets and exceeds all criteria expectations."
          }
        },
        {
          "key": "grammarConventions",
          "name": "Grammar & Conventions",
          "weight": 0.15,
          "description": "Adherence to spelling, punctuation, grammar, and syntax standards.",
          "levels": {
            "0": "Empty submission or completely unrelated response.",
            "1": "Substandard quality, fails to meet multiple basic requirements, incoherent.",
            "2": "Average quality, meets basic criteria requirements but lacks depth.",
            "3": "High quality, meets all criteria with only minor, negligible flaws.",
            "4": "Exceptional quality, fully meets and exceeds all criteria expectations."
          }
        }
      ]
    }'::jsonb,
    true,
    CURRENT_TIMESTAMP
);
