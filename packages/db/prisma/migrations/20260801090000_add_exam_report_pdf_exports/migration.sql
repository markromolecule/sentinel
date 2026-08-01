-- CreateTable: exam_report_exports
-- This table stores metadata and lifecycle states for PDF report exports of examinations.
-- The exported PDF artifacts generated from these records must be stored privately and served via signed URLs.
CREATE TABLE "exam_report_exports" (
    "export_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exam_id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_snapshot" JSON NOT NULL,
    "storage_bucket" VARCHAR(100),
    "storage_path" VARCHAR(255),
    -- Allowed status values: PENDING, GENERATING, READY, FAILED, EXPIRED
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "failure_code" VARCHAR(50),
    "failure_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "request_snapshot" JSON,
    "created_by" UUID,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_report_exports_pkey" PRIMARY KEY ("export_id")
);

-- CreateIndex
CREATE INDEX "exam_report_exports_exam_id_idx" ON "exam_report_exports"("exam_id");

-- CreateIndex
CREATE INDEX "exam_report_exports_institution_id_idx" ON "exam_report_exports"("institution_id");

-- CreateIndex
CREATE INDEX "exam_report_exports_template_id_idx" ON "exam_report_exports"("template_id");

-- CreateIndex
CREATE INDEX "exam_report_exports_status_idx" ON "exam_report_exports"("status");

-- CreateIndex
CREATE INDEX "exam_report_exports_expires_at_idx" ON "exam_report_exports"("expires_at");

-- AddForeignKey: exam_report_exports -> exams (Cascade delete)
ALTER TABLE "exam_report_exports" ADD CONSTRAINT "exam_report_exports_exam_id_fkey" 
    FOREIGN KEY ("exam_id") REFERENCES "exams"("exam_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey: exam_report_exports -> institutions (Cascade delete)
ALTER TABLE "exam_report_exports" ADD CONSTRAINT "exam_report_exports_institution_id_fkey" 
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey: exam_report_exports -> pdf_templates (Restrict delete)
ALTER TABLE "exam_report_exports" ADD CONSTRAINT "exam_report_exports_template_id_fkey" 
    FOREIGN KEY ("template_id") REFERENCES "pdf_templates"("template_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey: exam_report_exports -> users (Set null delete)
ALTER TABLE "exam_report_exports" ADD CONSTRAINT "exam_report_exports_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
