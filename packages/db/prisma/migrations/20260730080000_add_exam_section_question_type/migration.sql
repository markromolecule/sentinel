-- AlterTable
ALTER TABLE "public"."exam_sections" ADD COLUMN "question_type" "public"."question_type";

-- CreateIndex
CREATE INDEX "exam_sections_question_type_idx" ON "public"."exam_sections"("question_type");

-- Backfill homogeneous non-empty sections
UPDATE "public"."exam_sections" es
SET "question_type" = (
    SELECT DISTINCT question_type
    FROM "public"."exam_questions" eq
    WHERE eq."exam_section_id" = es."exam_section_id"
)
WHERE es."exam_section_id" IN (
    SELECT "exam_section_id"
    FROM "public"."exam_questions"
    GROUP BY "exam_section_id"
    HAVING COUNT(DISTINCT "question_type") = 1
);
