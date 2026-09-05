-- CreateIndex
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_exam_created ON "exam_attempts"("student_id", "exam_id", "created_at" DESC NULLS LAST);

-- CreateIndex
CREATE INDEX IF NOT EXISTS idx_flagged_incidents_attempt_timestamp ON "flagged_incidents"("attempt_id", "timestamp" DESC NULLS LAST);

-- CreateIndex
CREATE INDEX IF NOT EXISTS idx_exam_section_assignments_composite ON "exam_section_assignments"("exam_id", "class_group_id", "section_id", "instructor_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_inst_created ON "audit_logs"("user_id", "institution_id", "created_at" DESC NULLS LAST);

-- CreateIndex
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_inst_created ON "notifications"("recipient_user_id", "institution_id", "created_at" DESC NULLS LAST);
