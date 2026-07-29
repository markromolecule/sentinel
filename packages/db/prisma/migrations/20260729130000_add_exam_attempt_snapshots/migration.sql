-- Freeze the exact attempt-time assessment payload so grading and reports
-- never need to rebuild from mutable live exam data.
ALTER TABLE "public"."exam_attempts"
ADD COLUMN "assessment_snapshot" JSONB,
ADD COLUMN "score_snapshot" JSONB,
ADD COLUMN "scoring_version" VARCHAR(64);
