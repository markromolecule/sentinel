-- CreateIndex
CREATE INDEX IF NOT EXISTS "flagged_incidents_attempt_timestamp_idx" ON "flagged_incidents"("attempt_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "live_inspection_leases_attempt_idx" ON "live_inspection_leases"("attempt_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "live_inspection_leases_exam_idx" ON "live_inspection_leases"("exam_id");
