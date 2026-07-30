-- DropIndex
DROP INDEX IF EXISTS "public"."exam_sections_question_type_idx";

-- AlterTable
ALTER TABLE "public"."exam_sections" DROP COLUMN IF EXISTS "question_type";
